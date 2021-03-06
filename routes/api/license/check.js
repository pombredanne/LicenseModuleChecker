/**
 * Created by hesk on 12/21/2014.
 */
var keystone = require('keystone'),
    async = require('async'),
    _ = require('underscore'),
    Product = keystone.list('Product'),
    License = keystone.list('License'),
    utils = require('keystone-utils'),
    tool = require('../../../lib/handler/checker')
    ;
exports = module.exports = function (req, res) {

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');


    var license = {
            status: false,
            createdAt: false,
            licensePerson: false,
            brandingRemoval: false,
            wwwSiteURL: false,
            licenseStatusLive: false,
            licenseHash: false,
            key: false
        },
        isError = false,
        message = "",
        Q = {},
        local = {
            handle: false,
            product: false,
            version: false
        };

    /**
     *
     * @param Query
     * @param checkArr
     * @returns {*}
     */
    var findProduct = function (product_id, version_reported, next) {
        Product.model.findOne()
            .where('_id', product_id)
            .exec(function (err, data) {

                if (err) {
                    console.log('[api.app.reg]  - First Line Error...');
                    console.log('------------------------------------------------------------');
                    return next({message: err.message});
                }

                if (!data) {
                    console.log('[api.app.reg] key:' + product_id);
                    console.log('[api.app.reg]  - Product not found...');
                    console.log('------------------------------------------------------------');
                    return next({message: 'Product not found'});
                }

                local.product = _.extend(product, data._doc);

                console.log('[api.app.reg]  - Product  found...');
                console.log('--------do checking in here-----------------');
                if (local.product.ver) {
                    var discovered_version = new tool.check_version(version_reported, local.product.ver);
                    local.version = discovered_version;
                }

                return next();
            });

    };
    /**
     * async method run business logic
     */
    async.series([
        function (next) {
            try {
                console.log('------------------------------------------------------------');
                console.log(req.body);
                console.log('------------------------------------------------------------');
                Q = tool.url_param_checker(req.body, ['domain', 'key']);
                if (req.body['version']) {
                    Q.version = req.body['version'];


                    /*  checkUpdate({
                     packageName: Q.domain,
                     packageVersion: Q.version,
                     isCLI: false
                     }, function (err, latestVersion, defaultMessage) {
                     if (!err) {
                     console.log(defaultMessage);
                     }
                     });*/
                }
                next();
            } catch (e) {
                return next({message: e.message});
            }
        },

        function (next) {
            console.log('[api.app.checklicense]  - Check license...');
            console.log('------------------------------------------------------------');


            License.model.findOne()
                .where('key', Q.key)
                .exec(function (err, data) {

                    if (err) {
                        console.log('[api.app.checklicense]  - First Line Error...');
                        console.log('------------------------------------------------------------');
                        return next({message: err.message});
                    }

                    if (!data) {
                        console.log('[api.app.checklicense]  - license not found...');
                        console.log('------------------------------------------------------------');
                        return next({message: 'license not found'});
                    }

                    // license = _.extend(data, license);
                    console.log('[api.app.checklicense]  - before ..', data);
                    console.log('------------------------------------------------------------');
                    license = _.extend(license, data._doc);
                    local.handle = data;

                    console.log('[api.app.checklicense]  - result after..', license);
                    console.log('------------------------------------------------------------');

                    if (license.siteURL != Q.domain)
                        return next({message: 'license is validated but domain name is not matched'});
                    if (!license.licenseStatusLive)
                        return next({message: 'license is not alive'});

                    if (Q.version) {
                        findProduct(license._id, Q.version, next);
                    }
                    return next();
                });


        },

        function (next) {
            try {

                var time = new Date();
                local.handle.checked = time.getTime();
                local.handle.save(function (err, doc) {

                    if (err) {
                        return next({message: e.message});
                    }

                    if (doc) {

                        console.log('[api.app.checklicense]  - result ..', doc);
                        console.log('------------------------------------------------------------');

                        return next();
                    }


                });


            } catch (e) {
                console.log('------------------------------------------------------------');
                return next({message: e.message});
            }
        },
        function (next) {


            return res.apiResponse({
                success: true,
                timestamp: new Date().getTime(),
                license_detail: license
            });
        }
    ], function (err) {
        if (err) {
            console.log('[api.app.checklicense]  - verify your license failed.', err);
            console.log('------------------------------------------------------------');

            return res.apiResponse({
                success: false,
                session: false,
                message: (err && err.message ? err.message : false) || 'Sorry, there was an error from verifying your license, please try again.'
            });
        }
    });
};
