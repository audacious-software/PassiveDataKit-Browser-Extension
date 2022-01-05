/* global chrome */

define(function () {
  const pdk = {}

  pdk.uploadPoint = function (endpoint, userId, generatorId, point, complete) {
    pdk.uploadBundle(endpoint, userId, generatorId, [point], complete)
  }

  pdk.uploadBundle = function (endpoint, userId, generatorId, points, complete) {
    const manifest = chrome.runtime.getManifest()

    const userAgent = manifest.name + '/' + manifest.version + ' ' + navigator.userAgent

    for (let i = 0; i < points.length; i++) {
      const metadata = {}

      if (points[i].date === undefined) {
        points[i].date = (new Date()).getTime()
      }

      metadata.source = userId
      metadata.generator = userAgent
      metadata['generator-id'] = generatorId
      metadata.timestamp = points[i].date / 1000 // Unix timestamp

      points[i]['passive-data-metadata'] = metadata
    }

    const dataString = JSON.stringify(points, 2)

    $.ajax({
      type: 'CREATE',
      url: endpoint,
      dataType: 'json',
      contentType: 'application/json',
      data: dataString,
      success: function (data, textStatus, jqXHR) {
        complete()
      }
    })
  }

  return pdk
})
