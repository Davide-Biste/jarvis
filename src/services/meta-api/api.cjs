let MetaApi = require('metaapi.cloud-sdk').default;

module.exports = {
    createConnection(token) {
        return new MetaApi(token)
    }
}
