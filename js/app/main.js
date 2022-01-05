/* global requirejs, chrome */

const PDK_IDENTIFIER = 'pdk-identifier'
const PDK_LAST_UPLOAD = 'pdk-last-upload'
// const PDK_TOTAL_UPLOADED = 'pdk-total-uploaded'

requirejs.config({
  shim: {
    jquery: {
      exports: '$'
    },
    bootstrap: {
      deps: ['jquery']
    }
  },
  baseUrl: 'vendor/js',
  paths: {
    app: '../../js/app',
    pdk: '../../js/lib/passive-data-kit',
    bootstrap: '../../vendor/js/bootstrap.bundle',
    moment: '../../vendor/js/moment.min',
    material: '../../vendor/js/material-components-web.min'
  }
})

requirejs(['material', 'moment', 'jquery'], function (mdc, moment) {
  requirejs(['app/home', 'app/history', 'app/config'], function (home, history, config) {
    document.documentElement.style.setProperty('--mdc-theme-primary', config.primaryColor)

    document.title = config.extensionName

    $('#extensionTitle').text(config.extensionName)
    $('#valueUploadUrl').text(config.uploadUrl)
    $('#valueAboutExtension').html(config.aboutExtension)

    const displayMainUi = function () {
      $('#loginScreen').hide()
      $('#settingsScreen').hide()
      $('#reviewScreen').hide()
      $('#detailsScreen').show()
      $('#actionOpenSettings').show()
      $('#actionOpenReview').show()
      $('#actionCloseSettings').hide()

      chrome.storage.local.get({ 'pdk-identifier': '' }, function (result) {
        if (result[PDK_IDENTIFIER] === '') {
          $('#valueIndentifier').text('Unknown')
        } else {
          $('#valueIndentifier').text(result[PDK_IDENTIFIER])
        }
      })

      chrome.storage.local.get({ 'pdk-last-upload': '' }, function (result) {
        if (result[PDK_LAST_UPLOAD] === '') {
          $('#valueLastUpload').text('Never')
        } else {
          $('#valueLastUpload').text(moment(result[PDK_LAST_UPLOAD]).format('llll'))
        }
      })
    }

    const displayReviewUi = function () {
      $('#loginScreen').hide()
      $('#settingsScreen').hide()
      $('#reviewScreen').show()
      $('#detailsScreen').hide()
      $('#actionOpenSettings').hide()
      $('#actionOpenReview').hide()
      $('#actionCloseSettings').show()
    }

    const displaySettingsUi = function () {
      $('#loginScreen').hide()
      $('#detailsScreen').hide()
      $('#reviewScreen').hide()
      $('#settingsScreen').show()
      $('#actionOpenSettings').hide()
      $('#actionOpenReview').hide()
      $('#actionCloseSettings').show()
    }

    const dialog = new mdc.dialog.MDCDialog(document.querySelector('#dialog'))

    const displayIdentifierUi = function () {
      $('#loginScreen').show()
      $('#detailsScreen').hide()
      $('#reviewScreen').hide()
      $('#settingsScreen').hide()
      $('#actionOpenSettings').hide()
      $('#actionOpenReview').hide()
      $('#actionCloseSettings').hide()

      let identifierValidated = false
      let identifier = null

      $('#submitIdentifier').click(function (eventObj) {
        eventObj.preventDefault()
        identifier = $('#identifier').val()

        home.validateIdentifier(identifier, function (title, message) {
          $('#dialog-title').text(title)
          $('#dialog-content').text(message)

          dialog.open()

          identifierValidated = true
        }, function (title, message) {
          $('#dialog-title').text(title)
          $('#dialog-content').text(message)

          dialog.open()

          identifierValidated = false
        })
      })

      dialog.listen('MDCDialog:closed', function (event) {
        if (identifierValidated) {
          chrome.storage.local.set({
            'pdk-identifier': identifier
          }, function (result) {
            displayMainUi()
          })
        }
      })

      $('#detailsScreen').hide()
      $('#loginScreen').show()
    }

    chrome.storage.local.get({ 'pdk-identifier': '' }, function (result) {
      if (result[PDK_IDENTIFIER] === '') {
        displayIdentifierUi()
      } else {
        displayMainUi()
      }
    })

    for (const item in mdc) {
      console.log('  ' + item)
    }

    /* eslint-disable no-unused-vars */

    const appBar = new mdc.topAppBar.MDCTopAppBar(document.querySelector('.mdc-top-app-bar'))
    const identifierField = new mdc.textField.MDCTextField(document.querySelector('#field_identifier'))
    const someButton = new mdc.ripple.MDCRipple(document.querySelector('.mdc-button'))

    const progressBar = new mdc.linearProgress.MDCLinearProgress(document.querySelector('.mdc-linear-progress'))
    progressBar.determinate = true
    progressBar.progress = 0.66

    const blacklistField = new mdc.textField.MDCTextField(document.querySelector('#field_blacklist'))

    const helperText = new mdc.textField.MDCTextFieldHelperText(document.querySelector('.mdc-text-field-helper-text'))

    const searchField = new mdc.textField.MDCTextField(document.querySelector('#field_visits_search'))

    const deleteVisitDialog = new mdc.dialog.MDCDialog(document.querySelector('#delete_visit_dialog'))

    /* eslint-ensable no-unused-vars */

    const refreshVisitsView = function () {
      $('#search_visits').html('sync')

      history.search($('#field_visits_input').val(), 100, function (matches) {
        $('#visits_list').html('')

        if (matches.length > 0) {
          const items = []

          $.each(matches, function (i, item) {
            let liElement = '<li class="mdc-list-item"><span class="mdc-list-item__text"><span class="mdc-list-item__primary-text">'
            liElement += item.title
            liElement += '</span><span class="mdc-list-item__secondary-text">'
            liElement += item.host
            liElement += '</span></span><button class="mdc-icon-button material-icons mdc-list-item__meta visit_delete_button" id="visit_' + item.visitId + '">clear</button></li>'

            items.push(liElement)
          })

          $('#visits_list').append(items.join(''))
        } else {
          $('#visits_list').append('<li class="mdc-list-item"><span class="mdc-list-item__text">No visits found for "' + $('#field_visits_input').val() + '". Please refine your search term.</span></li>')
        }

        $('.visit_delete_button').off('click')

        $('.visit_delete_button').click(function (eventObj) {
          const visitId = parseInt($(eventObj.target).attr('id').replace('visit_', ''))

          $.each(matches, function (i, item) {
            if (item.visitId === visitId) {
              const title = 'Delete Visits?'
              const message = 'Do you want to delete all visits to this page?<br /><br />' + item.title + '<br /><em>' + item.host + '</em>'

              $('#delete-visit-dialog-title').text(title)
              $('#delete-visit-dialog-content').html(message)

              deleteVisitDialog.open()

              deleteVisitDialog.listen('MDCDialog:closed', function (event) {
                if (event.detail.action === 'delete') {
                  $('#search_visits').html('sync')

                  history.deleteVisits(item.url, function () {
                    refreshVisitsView()
                  })
                }
              })
            }
          })
        })

        $('#search_visits').html('search')
      })
    }

    $('#field_visits_input').keypress(function (e) {
      const key = e.which

      if (key === 13) { // the enter key code
        refreshVisitsView()
        return false
      }
    })

    const deletePatternDialog = new mdc.dialog.MDCDialog(document.querySelector('#delete_pattern_dialog'))

    const refreshPatternsView = function () {
      $('#add_blacklist').html('sync')

      history.fetchPatterns(function (patterns) {
        $('#patterns_list').html('')

        if (patterns.length > 0) {
          const items = []

          $.each(patterns, function (i, item) {
            let liElement = '<li class="mdc-list-item"><span class="mdc-list-item__text"><em>'
            liElement += item.pattern
            liElement += '</em></span><button class="mdc-icon-button material-icons mdc-list-item__meta pattern_delete_button" id="pattern_' + i + '">clear</button></li>'

            items.push(liElement)
          })

          $('#patterns_list').append(items.join(''))
        } else {
          $('#patterns_list').append('<li class="mdc-list-item"><span class="mdc-list-item__text"><em>No blacklist patterns saved.</span></li>')
        }

        $('.pattern_delete_button').off('click')

        $('.pattern_delete_button').click(function (eventObj) {
          const index = parseInt($(eventObj.target).attr('id').replace('pattern_', ''))

          const pattern = patterns[index]

          const title = 'Delete Pattern?'
          const message = 'Do you want to remove the pattern "' + pattern.pattern + '"?'

          $('#delete-pattern-dialog-title').text(title)
          $('#delete-pattern-dialog-content').html(message)

          deletePatternDialog.open()

          deletePatternDialog.listen('MDCDialog:closed', function (event) {
            if (event.detail.action === 'delete') {
              $('#add_blacklist').html('sync')

              history.deletePattern(pattern.pattern, function () {
                refreshPatternsView()
              })
            }
          })
        })

        $('#add_blacklist').html('add_circle')
      })
    }

    refreshPatternsView()

    /* eslint-disable no-unused-vars */

    const addBlacklistButton = new mdc.textField.MDCTextFieldIcon(document.querySelector('#add_blacklist'))
    const searchFieldButton = new mdc.textField.MDCTextFieldIcon(document.querySelector('#search_visits'))

    /* eslint-enable no-unused-vars */

    $('#search_visits').click(function (eventObj) {
      eventObj.preventDefault()

      refreshVisitsView()
    })

    $('#add_blacklist').click(function (eventObj) {
      eventObj.preventDefault()

      const pattern = $('#field_blacklist_input').val().trim().toLowerCase()

      if (pattern.length > 0) {
        console.log('add pattern: ' + pattern)

        history.addPattern(pattern, function () {
          refreshPatternsView()

          $('#field_blacklist_input').val('')
        })
      }
    })

    $('#field_blacklist_input').keypress(function (e) {
      const key = e.which

      if (key === 13) { // the enter key code
        $('#add_blacklist').click()
        return false
      }
    })

    $('#blacklist_message').html(config.blacklistMessage)

    $('#actionCloseSettings').click(function (eventObj) {
      eventObj.preventDefault()

      displayMainUi()

      return false
    })

    $('#actionOpenSettings').click(function (eventObj) {
      eventObj.preventDefault()

      displaySettingsUi()

      return false
    })

    $('#actionOpenReview').click(function (eventObj) {
      eventObj.preventDefault()

      displayReviewUi()

      return false
    })

    $('#resetExtension').click(function (eventObj) {
      eventObj.preventDefault()

      history.resetDataCollection(function () {
        displayMainUi()
      })

      return false
    })

    $('#uploadData').click(function (eventObj) {
      eventObj.preventDefault()

      $('#uploadData').attr('disabled', true)

      history.uploadPendingVisits(function () {
        const now = new Date()

        chrome.storage.local.set({
          'pdk-last-upload': now
        }, function (result) {
          $('#valueLastUpload').text(moment(now).format('llll'))

          history.progressListener('Uploaded pending visits', true, 1.0)

          history.fetchUploadedTransmissionsCount(function (err, uploadedCount) {
            if (err) {
              console.log(err)
            }

            $('#valueTotalUploaded').text('' + uploadedCount)
          })

          history.fetchPendingTransmissionsCount(function (err, pendingCount) {
            if (err) {
              console.log(err)
            }

            $('#valuePendingItems').text('' + pendingCount)
          })

          $('#uploadData').attr('disabled', false)
        })
      })

      return false
    })

    history.progressListener = function (message, determinate, progress) {
      if (determinate !== progressBar.determinate) {
        progressBar.determinate = determinate
      }

      if (progress >= 0 && determinate) {
        progressBar.progress = progress
      }

      $('#progressDescription').html(message)
    }

    history.updatePendingVisits(function (pendingCount) {
      $('#valuePendingItems').text('' + pendingCount)

      history.fetchUploadedTransmissionsCount(function (err, uploadedCount) {
        if (err) {
          console.log(err)
        }

        $('#valueTotalUploaded').text('' + uploadedCount)
      })
    }, 15000)

    history.fetchUploadedTransmissionsCount(function (err, uploadedCount) {
      if (err) {
        console.log(err)
      }

      $('#valueTotalUploaded').text('' + uploadedCount)
    })
  })
})
