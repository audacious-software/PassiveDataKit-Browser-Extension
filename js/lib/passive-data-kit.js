define(function() {
	var pdk = {};
	
	pdk.uploadPoint = function(endpoint, userId, generatorId, point, complete) {
		pdk.uploadBundle(endpoint, userId, generatorId, [point], complete);
	}

	pdk.uploadBundle = function(endpoint, userId, generatorId, points, complete) {
		var manifest = chrome.runtime.getManifest();
	
		var userAgent = manifest['name'] + '/' + manifest['version'] + ' ' + navigator.userAgent;
	
		for (var i = 0; i < points.length; i++) {
			var metadata = {};
			
			if (points[i]["date"] == undefined) {
				points[i]["date"] = (new Date()).getTime();
			}
	
			metadata['source'] = userId;
			metadata['generator'] = userAgent;
			metadata['generator-id'] = generatorId;
			metadata['timestamp'] = points[i]["date"] / 1000; // Unix timestamp
		
			points[i]['passive-data-metadata'] = metadata;
		}
				
		var dataString = JSON.stringify(points, 2);
	
		$.ajax({
			type: "CREATE",
			url: endpoint,
			dataType: "json",
			contentType: "application/json",
			data: dataString,
			success: function(data, textStatus, jqXHR) {
				complete();
			}
		});
	}
	
	return pdk;
});