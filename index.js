var crypto  = require("crypto");
var oauth   = require("oauth");
var EasyXml = require('easyxml');
var xml2js = require('xml2js');
var inflect = require('inflect');

var XERO_BASE_URL = 'https://api.xero.com';
var XERO_API_URL = XERO_BASE_URL + '/api.xro/2.0';

function Xero(key, secret, rsa_key, showXmlAttributes, customHeaders) {
    this.key = key;
    this.secret = secret;

    this.parser = new xml2js.Parser({explicitArray: false, ignoreAttrs: showXmlAttributes !== undefined ? (showXmlAttributes ? false : true) : true, async: true});

    this.oa = new oauth.OAuth(null, null, key, secret, '1.0', null, "PLAINTEXT", null, customHeaders);
    this.oa._signatureMethod = "RSA-SHA1"
    this.oa._createSignature = function(signatureBase, tokenSecret) {
        return crypto.createSign("RSA-SHA1").update(signatureBase).sign(rsa_key, output_format = "base64");
    }
}

Xero.prototype.call = function(method, path, body, callback) {
    var self = this;

    var post_body = null;
    var content_type = null;
    if (method && method !== 'GET' && body) {
        if (Buffer.isBuffer(body)) {
            post_body = body;
            // console.log('post_body in if: ', post_body);
        } else {
            var root = path.match(/([^\/\?]+)/)[1];
            var splitPath = path.split('/');
            var rootElement = splitPath.length === 4 ? splitPath[3] : inflect.singularize(root);

            //unwrappedArrays is more explicit & less magic. Should try to use this everywhere eventually.
            var unwrappedArrays = root === 'Invoices' ? true : false;
            post_body = new EasyXml({rootElement: rootElement, rootArray: root, unwrappedArrays: unwrappedArrays, manifest: true}).render(body);
            content_type = 'application/xml';
        }
    }
    var process = function(err, xml, res) {
        if (err) {
            return callback(err);
        }

        self.parser.parseString(xml, function(err, json) {
            if (err) return callback(err);
            if (json && json.Response && json.Response.Status !== 'OK') {
                return callback(json, res);
            } else {
                return callback(null, json, res);
            }
        });
    };
    // console.log('self.key, self.secret, method, XERO_API_URL + path, null, post_body, content_type, callback ? process : null');
    // console.log(self.key, self.secret, method, XERO_API_URL + path, null, post_body, content_type, callback ? process : null);
    return self.oa._performSecureRequest(self.key, self.secret, method, XERO_API_URL + path, null, post_body, content_type, callback ? process : null);
}

module.exports = Xero;