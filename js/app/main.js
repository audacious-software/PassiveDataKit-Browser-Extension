
const PDK_IDENTIFIER = "pdk-identifier";
const PDK_LAST_UPLOAD = "pdk-last-upload";
const PDK_TOTAL_UPLOADED = "pdk-total-uploaded";

requirejs.config({
	shim: {
		jquery: {
			exports: "$"
		},
		bootstrap: {
			deps: ["jquery"]
		},
	},
	baseUrl: "vendor/js",
	paths: {
		app: '../../js/app',
		pdk: "../../js/lib/passive-data-kit",
		bootstrap: "../../vendor/js/bootstrap.bundle",
		moment: "../../vendor/js/moment.min",
		material: "https://unpkg.com/material-components-web@latest/dist/material-components-web.min"
	}
});

requirejs(["material", "moment", "jquery"], function(mdc, moment) {
	requirejs(["app/home", "app/history", 'app/config'], function(home, history, config) {
		document.documentElement.style.setProperty('--mdc-theme-primary', config.primaryColor);

		document.title = config.extensionName;

		$("#extensionTitle").text(config.extensionName);
		$("#valueUploadUrl").text(config.uploadUrl);
		$("#valueAboutExtension").html(config.aboutExtension);

		var displayMainUi = function() {
			$("#loginScreen").hide();
			$("#settingsScreen").hide();
			$("#reviewScreen").hide();
			$("#detailsScreen").show();
			$("#actionOpenSettings").show();
			$("#actionOpenReview").show();
			$("#actionCloseSettings").hide();
			
			chrome.storage.local.get({ "pdk-identifier": ''}, function(result) {
				if (result[PDK_IDENTIFIER] == "") {
					$("#valueIndentifier").text("Unknown");
				} else {
					$("#valueIndentifier").text(result[PDK_IDENTIFIER]);
				}
			});

			chrome.storage.local.get({ "pdk-last-upload": ''}, function(result) {
				if (result[PDK_LAST_UPLOAD] == "") {
					$("#valueLastUpload").text("Never");
				} else {
					$("#valueLastUpload").text(moment(result[PDK_LAST_UPLOAD]).format('llll'));
				}
			});
		};

		var displayReviewUi = function() {
			$("#loginScreen").hide();
			$("#settingsScreen").hide();
			$("#reviewScreen").show();
			$("#detailsScreen").hide();
			$("#actionOpenSettings").hide();
			$("#actionOpenReview").hide();
			$("#actionCloseSettings").show();
		};
		
		var displaySettingsUi = function() {
			$("#loginScreen").hide();
			$("#detailsScreen").hide();
			$("#reviewScreen").hide();
			$("#settingsScreen").show();
			$("#actionOpenSettings").hide();
			$("#actionOpenReview").hide();
			$("#actionCloseSettings").show();
		};

		var displayIdentifierUi = function() {
			$("#loginScreen").show();
			$("#detailsScreen").hide();
			$("#reviewScreen").hide();
			$("#settingsScreen").hide();
			$("#actionOpenSettings").hide();
			$("#actionOpenReview").hide();
			$("#actionCloseSettings").hide();

			var identifierValidated = false;
			var identifier = null;
		
			$("#submitIdentifier").click(function(eventObj) {
				eventObj.preventDefault();
				identifier = $("#identifier").val();
			
				home.validateIdentifier(identifier, function(title, message) {
					console.log("S: " + title + " -- "  + message);
				
					$("#dialog-title").text(title);
					$("#dialog-content").text(message);

					dialog.open();
				
					identifierValidated = true;
			
				}, function(title, message) {
					console.log("E: " + title + " -- "  + message);

					$("#dialog-title").text(title);
					$("#dialog-content").text(message);

					dialog.open();

					identifierValidated = false;
				})
			});
		
			dialog.listen('MDCDialog:closed', function(event) {
				if (identifierValidated) {
					chrome.storage.local.set({
						"pdk-identifier": identifier 
					}, function(result) {
						displayMainUi();
					});
				}
			});
			
			$("#detailsScreen").hide();
			$("#loginScreen").show();
		};

		chrome.storage.local.get({ "pdk-identifier": ''}, function(result) {
			if (result[PDK_IDENTIFIER] == "") {
				displayIdentifierUi();
			} else {
				displayMainUi();
			}
		});
		
		for (var item in mdc) {
			console.log("  " + item);
		}

		const actionBar = new mdc.topAppBar.MDCTopAppBar(document.querySelector('.mdc-top-app-bar'));
		const identifierField = new mdc.textField.MDCTextField(document.querySelector('.mdc-text-field'));
		const buttonRipple = new mdc.ripple.MDCRipple(document.querySelector('.mdc-button'));
		const dialog = new mdc.dialog.MDCDialog(document.querySelector('.mdc-dialog'));

		const progressBar = new mdc.linearProgress.MDCLinearProgress(document.querySelector('.mdc-linear-progress'));
		progressBar.determinate = true;
		progressBar.progress = 0.66;

		$("#actionCloseSettings").click(function(eventObj) {
			eventObj.preventDefault();
			
			displayMainUi();
			
			return false;
		});

		$("#actionOpenSettings").click(function(eventObj) {
			eventObj.preventDefault();
			
			displaySettingsUi();
			
			return false;
		});

		$("#actionOpenReview").click(function(eventObj) {
			eventObj.preventDefault();
			
			displayReviewUi();
			
			return false;
		});

		$("#resetExtension").click(function(eventObj) {
			eventObj.preventDefault();
			
			history.resetDataCollection(function() {
				displayMainUi();
			});
			
			return false;
		});

		$("#uploadData").click(function(eventObj) {
			eventObj.preventDefault();
			
			$("#uploadData").attr("disabled", true);
			
			history.uploadPendingVisits(function() {
				var now = new Date();
			
                chrome.storage.local.set({
                    "pdk-last-upload": now
                }, function(result) {
					$("#valueLastUpload").text(moment(now).format('llll'));
					
					history.progressListener("Uploaded pending visits", true, 1.0);

					history.fetchUploadedTransmissionsCount(function(uploadedCount) {
						$("#valueTotalUploaded").text("" + uploadedCount);
					});

					history.fetchPendingTransmissionsCount(function(pendingCount) {
						$("#valuePendingItems").text("" + pendingCount);
					});

					$("#uploadData").attr("disabled", false);
                });
			});
			
			return false;
		});
		
		history.progressListener = function(message, determinate, progress) {
			if (determinate != progressBar.determinate) {
				progressBar.determinate = determinate;
			}
			
			if (progress >= 0 && determinate) {
				progressBar.progress = progress;
			}
			
			$("#progressDescription").html(message);
		};

		history.updatePendingVisits(function(pendingCount) {
			console.log("UPDATE PENDING!");
			
			$("#valuePendingItems").text("" + pendingCount);
			
			history.fetchUploadedTransmissionsCount(function(uploadedCount) {
				$("#valueTotalUploaded").text("" + uploadedCount);
			});
		}, 15000);
		
		history.fetchUploadedTransmissionsCount(function(uploadedCount) {
			$("#valueTotalUploaded").text("" + uploadedCount);
		});
	});
});
