function makeResponse(success, message, data = null) {
  return { success, message, data };
}

function ok(data, message = 'OK') {
  return makeResponse(true, message, data);
}

function error(message = 'Error', data = null) {
  return makeResponse(false, message, data);
}

module.exports = { makeResponse, ok, error };