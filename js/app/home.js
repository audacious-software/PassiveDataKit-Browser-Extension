define([], function () {
  const home = {}

  home.validateIdentifier = function (identifier, success, error) {
    if (identifier === null || identifier === undefined || identifier.trim() === '') {
      error('Identifier Required', 'Please enter an identifier to continue.')

      return
    }

    identifier = identifier.trim()

    if (identifier.length < 8) {
      error('Incomplete Identifier', 'Please enter at least 8 characters to continue.')

      return
    }

    if (identifier.length < 8) {
      error('Incomplete Identifier', 'Please enter at least 8 characters to continue.')

      return
    }

    if (identifier.search(' ') !== -1) {
      error('Invalid Identifier', 'Identifiers cannot contain spaces.')

      return
    }

    success('Identifier Validated', 'Thank you for validating your identifier.')
  }

  return home
})
