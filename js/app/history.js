define(['pdk', 'app/config'], function (pdk, config) {   
    var history = {};

	history.progressListener = null;
	
    history.pendingVisits = 0;
    history.pendingHistoryItems = [];
    history.recordingVisits = false;
    history.pendingVisitsList = [];
    
    history.patterns = null;

    history.updatePendingVisits = function(callback, repeatInteval) {
        window.onbeforeunload = function(event) {
            event.preventDefault();
            
            return "Currently updating your visits. Are you sure you want to close this window?";
        };
    
        chrome.storage.local.get({ "pdk-latest-fetch-from-history": 0}, function(result) {
            var since = result["pdk-latest-fetch-from-history"];
            
            if (config.onlyNewVisits && since == 0) {
            	since = (new Date()).getTime();

				chrome.storage.local.set({
					"pdk-latest-fetch-from-history": since 
				}, function(result) {

				});
            }
            
            var lastVisited = since;
            
            var query = {
                text: "",
                startTime: since
            };
            
            if (since == 0) {
                query = {
                    text: "",
                    startTime: since,
                    maxResults: Math.pow(2, 31) - 1
                }
            }
            
            if (history.progressListener != null) {
	            history.progressListener("Reviewing recently visited sites…", false, 0);
            }
            
            chrome.history.search(query, function(visitedUrls) {
                if (visitedUrls.length == 0) {
                    history.fetchPendingTransmissionsCount(callback);

                    window.onbeforeunload = function(event) {};                    

					if (history.progressListener != null) {
			            history.progressListener("Reviewed recently visited sites.", true, 1.0);
					}

                    window.setTimeout(function() {
                        history.updatePendingVisits(callback, repeatInteval);
                    }, repeatInteval);
                } else {
                    var latest = 0;
                    
                    var currentUrls = [];
                    
                    for (var i = 0; i < visitedUrls.length; i++) {
                        var url = visitedUrls[i];
                        
                        currentUrls.push(url);
                        
                        if (url.lastVisitTime > lastVisited) {
                            lastVisited = url.lastVisitTime;
                        }
                    }
                    
                    lastVisited += 1;
                    
                    chrome.storage.local.set({
                        "pdk-latest-fetch-from-history": lastVisited 
                    }, function(result) {
                        history.fetchPendingTransmissionsCount(callback);
                        
                        for (var i = 0; i < currentUrls.length; i++) {
                            var url = currentUrls[i];
                            
                            if (history.pendingHistoryItems.indexOf(url) == -1) {
                                history.pendingHistoryItems.push(url);
                            }
                        }

                        history.fetchUpdatedVisitsForHistoryItems(since, function() {
                            history.updatePendingVisits(callback, repeatInteval);
                        });
                    });
                }
            });
        });
    };
    
    history.fetchUpdatedVisitsForHistoryItems = function(since, onComplete) {
        if (history.pendingHistoryItems.length == 0) {
            onComplete();
        } else {
            if (history.pendingHistoryItems.length % 1000 == 0) {
				if (history.progressListener != null) {
					var pages = history.pendingVisitsList.length - (history.pendingVisitsList.length % 1000);

					history.progressListener("Remaining sites to review: " + history.pendingHistoryItems.length + ', pages: ' + pages + '.', false, 0.0);
				}
            }

            var item = history.pendingHistoryItems.pop();
        
            chrome.history.getVisits({
                url: item.url
            }, function(visits) {
                for (var i = 0; i < visits.length; i++) {
                    var visit = visits[i];
                
                    if (visit.visitTime >= since) {
                        history.queueVisit(item, visit);
                    }
                }
            
                window.setTimeout(function() {
                    history.fetchUpdatedVisitsForHistoryItems(since, onComplete);
                }, 0);
            });
        }
    };
    
    history.queueVisit = function(historyItem, visit) {
    	if (history.patterns == null) {
			history.fetchPatterns(function(patterns) {
				history.patterns = [];
				
				for (var i = 0; i < patterns.length; i++) {
					history.patterns.push(patterns[i]["pattern"])
				}
				
				history.queueVisit(historyItem, visit);
			});
    	} else {
			var visitRecord = {};
		
			visitRecord["visitTime"] = visit.visitTime;
			visitRecord["transition"] = visit.transition;
			visitRecord["referringVisitId"] = visit.referringVisitId;
			visitRecord["transmitted"] = 0;
			visitRecord["title"] = historyItem.title;
			visitRecord["url"] = historyItem.url;
			
			var blacklisted = false;
			
			for (var i = 0; i < history.patterns.length; i++) {
				if (historyItem.url.toLowerCase().includes(history.patterns[i].toLowerCase())) {
					blacklisted = true;
				}
			}
			
			if (blacklisted) {
				console.log("BLACKLISTED: " + historyItem.url);
			} else {
				visitRecord["visitId"] = visit.visitId;
				
				var url = new URL(historyItem.url);
		
				visitRecord["protocol"] = url.protocol;
				visitRecord["host"] = url.hostname;
		
				history.pendingVisitsList.push(visitRecord)
		
				if (history.recordingVisits == false) {
					history.recordingVisits = true;
			
					history.recordLatestVisit();
				}
		
				history.pendingVisits += 1;
			}
		}
    }
    
    history.recordLatestVisit = function() {
        if (history.pendingVisitsList.length == 0) {
            history.recordingVisits = false;

            return;
        }
        
        if (history.pendingVisitsList.length % 1000 == 0) {
			if (history.progressListener != null) {
				var sites = history.pendingHistoryItems.length - (history.pendingHistoryItems.length % 1000);
				
				history.progressListener("Remaining sites to review: " + sites + ', pages: ' + history.pendingVisitsList.length + '.', false, 0.0);
			}
        }
        
        history.openDatabase(function(db) {
            var visitRecord = history.pendingVisitsList.pop();
            
            var request = db.transaction(['visits'], 'readwrite')
                .objectStore('visits')
                .put(visitRecord);

            request.onsuccess = function (event) {
                window.setTimeout(history.recordLatestVisit, 0);
            };

            request.onerror = function (event) {
				console.log('The data has been written failed');
				console.log(event);

                window.setTimeout(history.recordLatestVisit, 0);
            }
        }, function(error) {
			if (history.progressListener != null) {
				history.progressListener('Unable to open database! (Code: 1)', true, 0);
			}

            history.recordingVisits == false;
        });
    }
    
    history.openDatabase = function(success, failure) {
        if (history.db != undefined) {
            success(history.db);
            
            return;
        }
        
        const VISITS_VERSION = 2;
        
        var request = window.indexedDB.open('history', VISITS_VERSION);
        
        request.onerror = function(event) {
            failure(event);
        };

        request.onsuccess = function (event) {
            history.db = request.result;

            success(history.db);
        };

        request.onupgradeneeded = function (event) {
            history.db = event.target.result;

            switch(event.oldVersion) {
                case 0: 
                    var visits = history.db.createObjectStore('visits', { keyPath: 'visitId' });
                    visits.createIndex('visitTime', 'visitTime', { unique: false });
                    visits.createIndex('transition', 'transition', { unique: false });
                    visits.createIndex('domain', 'domain', { unique: false });
                    visits.createIndex('transmitted', 'transmitted', { unique: false });
                    visits.createIndex('url', 'url', { unique: false });

                    var blacklist = history.db.createObjectStore('blacklist', { keyPath: 'pattern' });
            }
        };
    };
    
    history.search = function(query, limit, onComplete) {
		history.openDatabase(function(db) {
			var index = db.transaction(['visits'], 'readonly')
				.objectStore('visits')
				.index("transmitted");
			
			var request = index.getAll(0);
			
			query = query.toLowerCase();
			
			request.onsuccess = function() {
				var pendingItems = request.result;
				
				var matches = [];
				
				for (var i = 0; i < pendingItems.length && matches.length < limit; i++) {
					if (pendingItems[i]['url'].toLowerCase().includes(query) || pendingItems[i]['title'].toLowerCase().includes(query)) {
						matches.push(pendingItems[i])
					}
				}
				
				onComplete(matches);
			};

			request.onerror = function (event) {
				console.log("ERROR 1");
			};
		});
    }

    history.deleteVisits = function(url, onComplete) {
		history.openDatabase(function(db) {
			var store = db.transaction(['visits'], 'readwrite')
				.objectStore('visits');
				
			var index = store.index("transmitted");
			
			var request = index.getAll(0);
			
			request.onsuccess = function() {
				var pendingItems = request.result;
				
				var matches = [];
				
				var pendingDeletes = 0;
				
				for (var i = 0; i < pendingItems.length; i++) {
					if (pendingItems[i]['url'] == url) {
						pendingDeletes += 1;
						
						var deleteRequest = store.delete(pendingItems[i]['visitId']);
						
						deleteRequest.onsuccess = function(event) {
							pendingDeletes -= 1;

							if (pendingDeletes == 0) {
								onComplete();
							}
						};
					}
				}
			};

			request.onerror = function (event) {
				console.log("ERROR 1");
			};
		});
    }
    
    history.resetDataCollection = function(completed) {
        history.openDatabase(function(db) {
            var request = db.transaction(['visits'], 'readwrite')
                .objectStore('visits')
                .clear();
                
            request.onsuccess = function(event) {
                chrome.storage.local.set({
                    "pdk-latest-fetch-from-history": 0 
                }, function(result) {
					if (history.progressListener != null) {
						history.progressListener('Cleared saved visits.', true, 0.0);
					}
            
                    completed();
                });
            };

            request.onerror = function(event) {
				if (history.progressListener != null) {
					history.progressListener('Clearing saved visits failed!', true, 0.0);
				}
            };
        });
    }
    
    history.updateVisits = function(visits, complete) {
    	if (visits.length == 0) {
    		complete();
    	} else {
			history.openDatabase(function(db) {
				var visitRecord = visits.pop();
			
				var request = db.transaction(['visits'], 'readwrite')
					.objectStore('visits')
					.put(visitRecord);

				request.onsuccess = function (event) {
					window.setTimeout(function() {
						history.updateVisits(visits, complete);					
					}, 0);
				};

				request.onerror = function (event) {
					console.log('The data has been written failed');
					console.log(event);

					window.setTimeout(function() {
						history.updateVisits(visits, complete);					
					}, 0);
				}
			}, function(error) {
				if (history.progressListener != null) {
					history.progressListener('Unable to open database! (Code: 1)', true, 0);
				}
				
				complete();
			});
    	}
    }
    
    history.uploadPendingVisits = function(callback) {
		history.openDatabase(function(db) {
			var index = db.transaction(['visits'], 'readonly')
				.objectStore('visits')
				.index("transmitted");
			
			var request = index.getAll(0);

			request.onsuccess = function() {
				var pendingItems = request.result;
				
				if (pendingItems.length == 0) {
					callback();
				} else {
					if (history.progressListener != null) {
						history.progressListener('Uploading pending visits. Remaining: ' + pendingItems.length + '.', false, 0.0);
					}
					
					var toTransmit = [];
				
					for (var i = 0; i < pendingItems.length && i < 1000; i++) {
						var pendingItem = pendingItems[i];
					
						pendingItem['transmitted'] = new Date().getTime();
						pendingItem['date'] = pendingItem['visitTime'];

						toTransmit.push(pendingItem);
					}
					
					if (toTransmit.length == 0) {
						callback();
					} else {
						chrome.storage.local.get({ "pdk-identifier": ''}, function(result) {
							if (result["pdk-identifier"] != "") {
								pdk.uploadBundle(config.uploadUrl, result["pdk-identifier"], config.generator, toTransmit, function() {
									history.updateVisits(toTransmit, function() {
										window.setTimeout(function() {
											history.uploadPendingVisits(callback);
										}, 0);
									});
								});
							}
						});
					}
				}
			};

			request.onerror = function (event) {
				console.log("ERROR 1");
			};
    	});
    };

    history.fetchUploadedTransmissionsCount = function(callback) {
        history.openDatabase(function(db) {
            var index = db.transaction(['visits'], 'readonly')
                .objectStore('visits')
                .index("transmitted");

			var range = IDBKeyRange.lowerBound(0, true);                
            
            var request = index.count(range);

            request.onsuccess = function() {
                callback(request.result);
            }

            request.onerror = function (event) {
                callback("error");
            }
        }, function(error) {
			if (history.progressListener != null) {
				history.progressListener('Unable to open database! (Code: 2)', true, 0);
			}
        });
    };

    history.fetchPendingTransmissionsCount = function(callback) {
        history.openDatabase(function(db) {
            var index = db.transaction(['visits'], 'readonly')
                .objectStore('visits')
                .index("transmitted");
                
            var request = index.count(0);

            request.onsuccess = function() {
                callback(request.result);
            }

            request.onerror = function (event) {
                callback("error");
            }
        }, function(error) {
			if (history.progressListener != null) {
				history.progressListener('Unable to open database! (Code: 2)', true, 0);
			}
        });
    };
    
    history.addPattern = function(pattern, onComplete) {
		history.openDatabase(function(db) {
			var request = db.transaction(['blacklist'], 'readwrite')
				.objectStore('blacklist')
				.put({ pattern: pattern });

			request.onsuccess = function (event) {
				chrome.storage.local.get({ "pdk-identifier": ''}, function(result) {
					pdk.uploadPoint(config.uploadUrl, result["pdk-identifier"], 'pdk-web-added-blacklist-term', { pattern: pattern }, function() {
						window.setTimeout(function() {
							onComplete();					
						}, 0);
					});
				});
			};

			request.onerror = function (event) {
				console.log('The data has been written failed');
				console.log(event);

				window.setTimeout(function() {
					onComplete();					
				}, 0);
			}
		}, function(error) {
			if (history.progressListener != null) {
				history.progressListener('Unable to open database! (Code: 1)', true, 0);
			}
		
			onComplete();					
		});
    }
    
    history.fetchPatterns = function(onComplete) {
		history.openDatabase(function(db) {
			var store = db.transaction(['blacklist'], 'readonly')
				.objectStore('blacklist')
			
			var request = store.getAll();
			
			request.onsuccess = function() {
				var patterns = request.result;
				
				onComplete(patterns);
			};

			request.onerror = function (event) {
				console.log("ERROR 1");
			};
		});
    }

    history.deletePattern = function(pattern, onComplete) {
		history.openDatabase(function(db) {
			var store = db.transaction(['blacklist'], 'readwrite')
				.objectStore('blacklist');
				
			var request = store.delete(pattern);
			
			request.onsuccess = function() {
				chrome.storage.local.get({ "pdk-identifier": ''}, function(result) {
					pdk.uploadPoint(config.uploadUrl, result["pdk-identifier"], 'pdk-web-deleted-blacklist-term', { pattern: pattern }, function() {
						window.setTimeout(function() {
							onComplete();					
						}, 0);
					});
				});
			};

			request.onerror = function (event) {
				console.log("ERROR 1");
			};
		});
    }
    
    return history;
});
