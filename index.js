import Redis from 'redis';

const redisStore = (...args) => {
  const redisCache = Redis.createClient(...args);
  const storeArgs = redisCache.options;

  return {
    name: 'redis',
    getClient: () => redisCache,
    set: (key, value, options, cb) => (
      new Promise((resolve, reject) => {
        if (typeof options === 'function') {
          cb = options;
          options = {};
        }
        options = options || {};

        if (!cb) {
          cb = (err, result) => (err ? reject(err) : resolve(result));
        }

        const ttl = (options.ttl || options.ttl === 0) ? options.ttl : storeArgs.ttl;
        const val = JSON.stringify(value) || '"undefined"';

        if (ttl) {
          redisCache.setex(key, ttl, val, handleResponse(cb));
        } else {
          redisCache.set(key, val, handleResponse(cb));
        }
      })
    ),
    get: (key, options, cb) => (
      new Promise((resolve, reject) => {
        if (typeof options === 'function') {
          cb = options;
        }

        if (!cb) {
          cb = (err, result) => (err ? reject(err) : resolve(result));
        }

        redisCache.get(key, handleResponse(cb, { parse: true }));
      })
    ),
    del: (key, options, cb) => {
      if (typeof options === 'function') {
        cb = options;
      }

      redisCache.del(key, handleResponse(cb));
    },
    reset: cb => redisCache.flushdb(handleResponse(cb)),
    keys: (pattern, cb) => (
      new Promise((resolve, reject) => {
        if (typeof pattern === 'function') {
          cb = pattern;
          pattern = '*';
        }

        if (!cb) {
          cb = function cb(err, result) {
            return err ? reject(err) : resolve(result);
          };
        }
        
        
        var cursor = '0';
        var results = [];
        
        var whileScan = (cb) => {
            redisCache.scan(cursor,
            'MATCH', pattern,
            'COUNT', '1000',
            function (err, res) {            
              if (err) return cb(err);
              
              cursor = res[0];
              results = results.concat(res[1]);
              
              if(cursor == 0)
                cb(null, results);
              else 
                whileScan(cb);
             });
        }  
        
        whileScan(handleResponse(cb));
      });
    ),
    ttl: (key, cb) => redisCache.ttl(key, handleResponse(cb)),
    isCacheableValue: storeArgs.is_cacheable_value || (value => value !== undefined && value !== null),
  };
};

function handleResponse(cb, opts = {}) {
  return (err, result) => {
    if (err) {
      return cb && cb(err);
    }

    if (opts.parse) {
      try {
        result = JSON.parse(result);
      } catch (e) {
        return cb && cb(e);
      }
    }

    return cb && cb(null, result);
  };
}

const methods = {
  create: (...args) => redisStore(...args),
};

export default methods;
