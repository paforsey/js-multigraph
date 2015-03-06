(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * ajaxthrottle.js
 * 
 * Usage:
 * 
 *     var t = $.ajaxthrottle({
 *        numRequestsPerTimePeriod : N,
 *        timePeriod               : P,
 *        maxConcurrent            : M
 *     });
 *    
 *     t.ajax(args);
 *
 * This is just like calling $.ajax(args), except that requests are throttled
 * so that no more than N are initiated in any time period of P milliseconds,
 * and no more than M concurrent (outstanding at the same time) requests are allowed.
 * If N or P is 0, there is no time period based constraint, and if M is 0, there
 * is no constraint on the number of concurrent requests.
 * 
 * Mark Phillips <mphillip@unca.edu>
 * Thu Dec 20 11:04:19 2012
 */
(function($) {
    $.ajaxthrottle = function(options) {

        var timeout,

            settings = $.extend({
                numRequestsPerTimePeriod : 0,
                timePeriod               : 0,
                maxConcurrent            : 1
            }, options),

            time = function() {
                return (new Date()).getTime();
            },

            // Array of outstanding requests; these are requests that have
            // been initiated with a call to $.ajax() but that have not
            // completed yet.  Each entry in this array is an object of the form
            //    {
            //         arguments: the original arguments list passed to .ajax()
            //              time: the time this request was passed to $.ajax()
            //          deferred: the jQuery deferred object for this request
            //    }
            outstanding_reqs = [],

            // Array of initiated requests; each entry in this array
            // is an object just like the ones in the outstanding_reqs
            // array above, but this array keeps track of all
            // requests, regardless of whether they have completed.
            // This list is used to keep track of how many requests
            // have been initiated in settings.timePeriod.  Requests
            // that are older than settings.timePeriod milliseconds
            // get removed from this list when it is purged.
            initiated_reqs = [],

            // Array of requests waiting to be initiated
            waiting_reqs = [],

            // Purge the initiated reqs list so that it doesn't contain any
            // reqs from more than settings.timePeriod ms ago.  Return the
            // amount of time that needs to be waited until the oldest remaining
            // (after purging) req in the list will be settings.timePeriod ms old.
            // Do all of this relative to the passed in 'now' value.
            purge_initiated_reqs = function(now) {
                if (settings.timePeriod >= 0) {
                    while ((initiated_reqs.length > 0)
                           &&
                           (initiated_reqs[0].time + settings.timePeriod - now <= 0)) {
                        initiated_reqs.shift();
                    }
                    if (initiated_reqs.length > 0) {
                        return initiated_reqs[0].time + settings.timePeriod - now;
                    }
                }
                return 0;
            },

            // remove a req from the outstanding_reqs list
            remove_outstanding_req = function(obj) {
                $.each(outstanding_reqs, function(i) {
                    if (outstanding_reqs[i] === obj) {
                        outstanding_reqs.splice(i,1);
                        return false;
                    }
                    return true;
                });
            },

            // Initiate the next request on the waiting list, unless we need to wait
            // till some time has passed or some outstanding requests have completed.
            process_waiting = function() {
                var now = time(),
                    delay, req, deferred;

                if (waiting_reqs.length <= 0) {
                    return;
                }

                delay = purge_initiated_reqs(now);

                // If we have a timePeriod constraint, and the max number of allowed
                // requests have gone out in that time period, arrange to wait for
                // 'delay' ms
                if ((settings.numRequestsPerTimePeriod > 0) && (settings.timePeriod > 0)
                    &&
                    (delay > 0)
                    &&
                    (initiated_reqs.length >= settings.numRequestsPerTimePeriod)) {
                    // clear any existing timeout first, because this one will
                    // require waiting till after it would finish anyway
                    if (timeout !== undefined) {
                        clearTimeout(timeout);
                    }
                    timeout = setTimeout(function() {
                        timeout = undefined;
                        process_waiting();
                    }, delay);
                    return;
                }

                // If the max number of allowed requests is outstanding, do nothing;
                // process_waiting() will get called again when a request completes.
                if ((settings.maxConcurrent > 0)
                           &&
                           (outstanding_reqs.length >= settings.maxConcurrent)) {
                    return;
                }

                // If we make it to here, then it's OK to initiate the next
                // request in the waiting list
                req = waiting_reqs.shift();
                req.time = time();
                initiated_reqs.push(req);
                outstanding_reqs.push(req);
                $.ajax.apply($,req.arguments).done(function() {
                    req.deferred.resolve.apply(req.deferred, arguments);
                }).fail(function() {
                    req.deferred.reject.apply(req.deferred, arguments);
                }).always(function() {
                    remove_outstanding_req(req);
                    process_waiting();
                });
                
            }
        ;

        return {
            ajax : function() {
                var deferred = $.Deferred();
                waiting_reqs.push({ arguments : arguments, deferred : deferred });
                process_waiting();
                return deferred.promise();
            }
        };
    };
}(jQuery));

},{}],2:[function(require,module,exports){
(function ($) {
    "use strict";

    var methods = {
        on : function(on) {
            if (on === undefined) {
                return $(this).data('busy_spinner').on;
            } else {
                return this.each(function() {
                    if (on) {
                        $(this).data('busy_spinner').on    = true;
                        $(this).data('busy_spinner').level = 1;
                        $(this).show();
                    } else {
                        $(this).data('busy_spinner').on    = false;
                        $(this).data('busy_spinner').level = 0;
                        $(this).hide();
                    }
                    return this;
                });
            }            
        },

        level : function(delta) {
            if (delta === undefined) {
                return $(this).data('busy_spinner').level;
            } else {
                return this.each(function() {
                    if ($(this).data('busy_spinner').level + delta >= 0) {
                        $(this).data('busy_spinner').level = $(this).data('busy_spinner').level + delta;
                        if ($(this).data('busy_spinner').level === 1) {
                            $(this).busy_spinner('on', true);
                        } else if ($(this).data('busy_spinner').level === 0) {
                            $(this).busy_spinner('on', false);
                        }
                    }
                    return this;
                });
            }
        },

        init : function(options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('busy_spinner'),
                    settings = $.extend({
                        on : false
                    }, options);
                if ( ! data ) {
                    $this.data('busy_spinner', {
                        on    : settings.on,
                        level : 0
                    });
                    if (settings.on) {
                        $(this).show();
                    } else {
                        $(this).hide();
                    }
                    $(this).css({
                        width  : 32,
                        height : 32
                    }).append($('<img src="data:image/gif;base64,R0lGODlhIAAgAPMAAP///wAAAMbGxoSEhLa2tpqamjY2NlZWVtjY2OTk5Ly8vB4eHgQEBAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJCgAAACwAAAAAIAAgAAAE5xDISWlhperN52JLhSSdRgwVo1ICQZRUsiwHpTJT4iowNS8vyW2icCF6k8HMMBkCEDskxTBDAZwuAkkqIfxIQyhBQBFvAQSDITM5VDW6XNE4KagNh6Bgwe60smQUB3d4Rz1ZBApnFASDd0hihh12BkE9kjAJVlycXIg7CQIFA6SlnJ87paqbSKiKoqusnbMdmDC2tXQlkUhziYtyWTxIfy6BE8WJt5YJvpJivxNaGmLHT0VnOgSYf0dZXS7APdpB309RnHOG5gDqXGLDaC457D1zZ/V/nmOM82XiHRLYKhKP1oZmADdEAAAh+QQJCgAAACwAAAAAIAAgAAAE6hDISWlZpOrNp1lGNRSdRpDUolIGw5RUYhhHukqFu8DsrEyqnWThGvAmhVlteBvojpTDDBUEIFwMFBRAmBkSgOrBFZogCASwBDEY/CZSg7GSE0gSCjQBMVG023xWBhklAnoEdhQEfyNqMIcKjhRsjEdnezB+A4k8gTwJhFuiW4dokXiloUepBAp5qaKpp6+Ho7aWW54wl7obvEe0kRuoplCGepwSx2jJvqHEmGt6whJpGpfJCHmOoNHKaHx61WiSR92E4lbFoq+B6QDtuetcaBPnW6+O7wDHpIiK9SaVK5GgV543tzjgGcghAgAh+QQJCgAAACwAAAAAIAAgAAAE7hDISSkxpOrN5zFHNWRdhSiVoVLHspRUMoyUakyEe8PTPCATW9A14E0UvuAKMNAZKYUZCiBMuBakSQKG8G2FzUWox2AUtAQFcBKlVQoLgQReZhQlCIJesQXI5B0CBnUMOxMCenoCfTCEWBsJColTMANldx15BGs8B5wlCZ9Po6OJkwmRpnqkqnuSrayqfKmqpLajoiW5HJq7FL1Gr2mMMcKUMIiJgIemy7xZtJsTmsM4xHiKv5KMCXqfyUCJEonXPN2rAOIAmsfB3uPoAK++G+w48edZPK+M6hLJpQg484enXIdQFSS1u6UhksENEQAAIfkECQoAAAAsAAAAACAAIAAABOcQyEmpGKLqzWcZRVUQnZYg1aBSh2GUVEIQ2aQOE+G+cD4ntpWkZQj1JIiZIogDFFyHI0UxQwFugMSOFIPJftfVAEoZLBbcLEFhlQiqGp1Vd140AUklUN3eCA51C1EWMzMCezCBBmkxVIVHBWd3HHl9JQOIJSdSnJ0TDKChCwUJjoWMPaGqDKannasMo6WnM562R5YluZRwur0wpgqZE7NKUm+FNRPIhjBJxKZteWuIBMN4zRMIVIhffcgojwCF117i4nlLnY5ztRLsnOk+aV+oJY7V7m76PdkS4trKcdg0Zc0tTcKkRAAAIfkECQoAAAAsAAAAACAAIAAABO4QyEkpKqjqzScpRaVkXZWQEximw1BSCUEIlDohrft6cpKCk5xid5MNJTaAIkekKGQkWyKHkvhKsR7ARmitkAYDYRIbUQRQjWBwJRzChi9CRlBcY1UN4g0/VNB0AlcvcAYHRyZPdEQFYV8ccwR5HWxEJ02YmRMLnJ1xCYp0Y5idpQuhopmmC2KgojKasUQDk5BNAwwMOh2RtRq5uQuPZKGIJQIGwAwGf6I0JXMpC8C7kXWDBINFMxS4DKMAWVWAGYsAdNqW5uaRxkSKJOZKaU3tPOBZ4DuK2LATgJhkPJMgTwKCdFjyPHEnKxFCDhEAACH5BAkKAAAALAAAAAAgACAAAATzEMhJaVKp6s2nIkolIJ2WkBShpkVRWqqQrhLSEu9MZJKK9y1ZrqYK9WiClmvoUaF8gIQSNeF1Er4MNFn4SRSDARWroAIETg1iVwuHjYB1kYc1mwruwXKC9gmsJXliGxc+XiUCby9ydh1sOSdMkpMTBpaXBzsfhoc5l58Gm5yToAaZhaOUqjkDgCWNHAULCwOLaTmzswadEqggQwgHuQsHIoZCHQMMQgQGubVEcxOPFAcMDAYUA85eWARmfSRQCdcMe0zeP1AAygwLlJtPNAAL19DARdPzBOWSm1brJBi45soRAWQAAkrQIykShQ9wVhHCwCQCACH5BAkKAAAALAAAAAAgACAAAATrEMhJaVKp6s2nIkqFZF2VIBWhUsJaTokqUCoBq+E71SRQeyqUToLA7VxF0JDyIQh/MVVPMt1ECZlfcjZJ9mIKoaTl1MRIl5o4CUKXOwmyrCInCKqcWtvadL2SYhyASyNDJ0uIiRMDjI0Fd30/iI2UA5GSS5UDj2l6NoqgOgN4gksEBgYFf0FDqKgHnyZ9OX8HrgYHdHpcHQULXAS2qKpENRg7eAMLC7kTBaixUYFkKAzWAAnLC7FLVxLWDBLKCwaKTULgEwbLA4hJtOkSBNqITT3xEgfLpBtzE/jiuL04RGEBgwWhShRgQExHBAAh+QQJCgAAACwAAAAAIAAgAAAE7xDISWlSqerNpyJKhWRdlSAVoVLCWk6JKlAqAavhO9UkUHsqlE6CwO1cRdCQ8iEIfzFVTzLdRAmZX3I2SfZiCqGk5dTESJeaOAlClzsJsqwiJwiqnFrb2nS9kmIcgEsjQydLiIlHehhpejaIjzh9eomSjZR+ipslWIRLAgMDOR2DOqKogTB9pCUJBagDBXR6XB0EBkIIsaRsGGMMAxoDBgYHTKJiUYEGDAzHC9EACcUGkIgFzgwZ0QsSBcXHiQvOwgDdEwfFs0sDzt4S6BK4xYjkDOzn0unFeBzOBijIm1Dgmg5YFQwsCMjp1oJ8LyIAACH5BAkKAAAALAAAAAAgACAAAATwEMhJaVKp6s2nIkqFZF2VIBWhUsJaTokqUCoBq+E71SRQeyqUToLA7VxF0JDyIQh/MVVPMt1ECZlfcjZJ9mIKoaTl1MRIl5o4CUKXOwmyrCInCKqcWtvadL2SYhyASyNDJ0uIiUd6GGl6NoiPOH16iZKNlH6KmyWFOggHhEEvAwwMA0N9GBsEC6amhnVcEwavDAazGwIDaH1ipaYLBUTCGgQDA8NdHz0FpqgTBwsLqAbWAAnIA4FWKdMLGdYGEgraigbT0OITBcg5QwPT4xLrROZL6AuQAPUS7bxLpoWidY0JtxLHKhwwMJBTHgPKdEQAACH5BAkKAAAALAAAAAAgACAAAATrEMhJaVKp6s2nIkqFZF2VIBWhUsJaTokqUCoBq+E71SRQeyqUToLA7VxF0JDyIQh/MVVPMt1ECZlfcjZJ9mIKoaTl1MRIl5o4CUKXOwmyrCInCKqcWtvadL2SYhyASyNDJ0uIiUd6GAULDJCRiXo1CpGXDJOUjY+Yip9DhToJA4RBLwMLCwVDfRgbBAaqqoZ1XBMHswsHtxtFaH1iqaoGNgAIxRpbFAgfPQSqpbgGBqUD1wBXeCYp1AYZ19JJOYgH1KwA4UBvQwXUBxPqVD9L3sbp2BNk2xvvFPJd+MFCN6HAAIKgNggY0KtEBAAh+QQJCgAAACwAAAAAIAAgAAAE6BDISWlSqerNpyJKhWRdlSAVoVLCWk6JKlAqAavhO9UkUHsqlE6CwO1cRdCQ8iEIfzFVTzLdRAmZX3I2SfYIDMaAFdTESJeaEDAIMxYFqrOUaNW4E4ObYcCXaiBVEgULe0NJaxxtYksjh2NLkZISgDgJhHthkpU4mW6blRiYmZOlh4JWkDqILwUGBnE6TYEbCgevr0N1gH4At7gHiRpFaLNrrq8HNgAJA70AWxQIH1+vsYMDAzZQPC9VCNkDWUhGkuE5PxJNwiUK4UfLzOlD4WvzAHaoG9nxPi5d+jYUqfAhhykOFwJWiAAAIfkECQoAAAAsAAAAACAAIAAABPAQyElpUqnqzaciSoVkXVUMFaFSwlpOCcMYlErAavhOMnNLNo8KsZsMZItJEIDIFSkLGQoQTNhIsFehRww2CQLKF0tYGKYSg+ygsZIuNqJksKgbfgIGepNo2cIUB3V1B3IvNiBYNQaDSTtfhhx0CwVPI0UJe0+bm4g5VgcGoqOcnjmjqDSdnhgEoamcsZuXO1aWQy8KAwOAuTYYGwi7w5h+Kr0SJ8MFihpNbx+4Erq7BYBuzsdiH1jCAzoSfl0rVirNbRXlBBlLX+BP0XJLAPGzTkAuAOqb0WT5AH7OcdCm5B8TgRwSRKIHQtaLCwg1RAAAOwAAAAAAAAAAAA==" width="32" height="32" alt="ajax loading">'));
                }

                return this;
            });
        }
    };

    $.fn.busy_spinner = function( method ) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.busy_spinner' );
            return null;
        }    
    };
    
}(jQuery));

},{}],3:[function(require,module,exports){
(function ($) {
    "use strict";

    var errorDisplayHtml = (
        ''
            + '<div class="errorDisplay">'
            +   '<span class="errorDisplayOptions">'
            +     '<button class="errorDisplayDetailsButton">See Details</button>'
            +     '<a href="" class="errorDisplayXButton">&#10006;</a>'
            +   '</span>'
            +   '<span class="errorDisplayShortMessage"></span>'
            + '</div>'
            + '<span class="errorDisplayRetriever"></span>'
    );
    
    var detailDisplayHtml = (
        ''
            + '<div class="errorDisplayDetails">'
            +   '<span class="errorDisplayOptions">'
            +     '<a href="" class="errorDisplayXButton">&#10006;</a>'
            +   '</span>'
            +   '<span class="errorDisplayFullMessageArea"></span>'
            + '</div>'
    );
    
    var detailDisplayListHtml = (
        ''
            + '<ul class="errorDisplayFullMessageList">'
            + '</ul>'
    );
    
    var methods = {
        init : function(options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('errorDisplay'),
                    settings = $.extend({
                        'fontColor' : '#ff0000',
                        'backgroundColor' : '#ffffff',
                        'displayTime' : 1000,
                        'indicatorColor' : '#ff0000'
                    }, options);
                
                if ( ! data ) {
                    
                    $this.append(errorDisplayHtml);
                    $this.find('.errorDisplay').width($this.width()-6);  
                    
                    var detailDisplay = $(detailDisplayHtml).appendTo($("body"));
                    var detailDisplayList = $(detailDisplayListHtml);
                    
                    $(detailDisplay).find('.errorDisplayXButton').click(function(event) {
                        event.preventDefault();
                        $(detailDisplay).find('.errorDisplayOptions').hide();   
                        $(detailDisplay).hide();
                        $this.find('.errorDisplayRetriever').css('background-color', settings.indicatorColor).show();
                    });         
                    
                    $this.data('errorDisplay', {
                        'detailDisplay' : detailDisplay,
                        'detailDisplayList' : detailDisplayList,
                        'fontColor' : settings.fontColor,
                        'backgroundColor' : settings.backgroundColor,
                        'displayTime' : settings.displayTime,
                        'indicatorColor' : settings.indicatorColor
                    });
                    
                    
                    $this.find('.errorDisplayXButton').click(function(event) {
                        event.preventDefault(); 
                        $this.find('.errorDisplayOptions').hide();
                        $this.find('.errorDisplay').slideUp(settings.displayTime, function(){
                            $this.find('.errorDisplayRetriever').show();
                        });
                    });         
                    
                    
                    $this.find('.errorDisplayDetailsButton').click(function(event) {
                        event.preventDefault(); 
                        $this.find('.errorDisplay').off(); //stops mouseleaveevent when details button is clicked
                        $this.find('.errorDisplay').hide();                 
                        $this.find('.errorDisplayRetriever').hide();
                        $(detailDisplay).find('.errorDisplayFullMessageArea').empty().append($(detailDisplayList));
                        $(detailDisplay).find('.errorDisplayOptions').show();
                        $(detailDisplay).show();                     
                    });
                    
                }
                return this;
            });
        }, // init() method
        
        displayError : function(fullMessage, shortMessage, options) {
            return this.each(function() {
                var $this = $(this),
                    data = $this.data('errorDisplay'),
                    settings = $.extend({
                        'fontColor' : data.fontColor,
                        'backgroundColor' : data.backgroundColor,
                        'displayTime' : data.displayTime,
                        'indicatorColor' : data.indicatorColor
                    }, options);
                $this.find('.errorDisplayRetriever').hide();
                $this.find('.errorDisplayOptions').hide();
                $this.find('.errorDisplayShortMessage').css('color', settings.fontColor);   
                $this.find('.errorDisplay').css('background-color', settings.backgroundColor);
                  $this.find('.errorDisplayOptions').css('background-color', settings.backgroundColor);           
                  $this.find('.errorDisplayShortMessage').text(shortMessage);
                  $this.find('.errorDisplay').show();
                  $this.find('.errorDisplayRetriever').css('background-color', settings.indicatorColor);
                  
               if(settings.displayTime != -1){   
                  $this.find('.errorDisplay').slideUp(settings.displayTime, function(){
                      $this.find('.errorDisplayRetriever').show();
                  });                              
              }
                
               else{                   
                   $this.find('.errorDisplayOptions').show();
                   $this.find('.errorDisplay').show();
                 }
                
                $(data.detailDisplayList).append($('<li>'+fullMessage+'</li>').css('color', settings.fontColor));
                
                $this.find('.errorDisplayRetriever').hover(function(event) {
                    event.preventDefault();                 
                    $this.find('.errorDisplayOptions').hide();
                    $this.find('.errorDisplayShortMessage').text(shortMessage).css('color', settings.fontColor);                        
                    $this.find('.errorDisplay').slideDown(function(){
                      $this.find('.errorDisplayOptions').show();
                      $this.find('.errorDisplay').mouseleave(function(event){
                        event.preventDefault(); 
                        $this.find('.errorDisplayOptions').hide();
                        $this.find('.errorDisplay').slideUp(settings.displayTime, function(){
                            $this.find('.errorDisplayRetriever').show();
                        });                     
                      });     
                    });                   
                    $this.find('.errorDisplayRetriever').hide();
                });
            });

        } // displayError() method


    };

    $.fn.errorDisplay = function( method ) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.errorDisplay' );
            return null;
        }    
    };

}(jQuery));
jQuery('head').append(jQuery('<style type="text/css">.errorDisplay { font-family: Helvetica, sans-serif; color: #32446B; background-color: white; text-align: left; font-size: 12px; line-height: 12px; height: 45px; position: absolute; bottom: 0px; left: 0px; width: inherit; width: expression(this.parentNode.currentStyle[\'width\']); border: solid; border-color: #A9BADE; border-style: ridge; display: none; } .errorDisplayRetriever{ height: 8px; background-color: #ff0000; border-top-right-radius: 10px; width: 8px; position: absolute; bottom: 0px; left: 0px; display: none; } .errorDisplayShortMessage{ overflow-x: hidden; overflow-y: hidden; white-space: nowrap; position: absolute; bottom: 0px; left: 0px; width: 95%; margin-top: 20px; margin-left: 10px; margin-bottom: 5px; } .errorDisplayXButton { text-decoration: none; font-size: 15px; margin-top: 2px; position: absolute; right: 3px; top: 0px; color: #4D68A3; } .errorDisplayDetailsButton { margin-left: 10px; margin-right: 10px; position: relative; } .errorDisplayDetails{ position: fixed; top: 25%; height: 100px; width: 75%; text-align: left; border: solid; border-color: #A9BADE; border-style: ridge; background-color: white; display: none; } .errorDisplayFullMessageArea { font-family: Helvetica, sans-serif; font-size: .833em; color: #32446B; height: 80px; width: inherit; width: expression(this.parentNode.currentStyle[\'width\']); position: fixed; margin-top: 15px; } .errorDisplayFullMessageList { overflow: auto; white-space: nowrap; height: 80px; margin-top: 5px; } .errorDisplayOptions{ background-color: #FFFFFF; display: inline; } </style>'));

},{}],4:[function(require,module,exports){
/**
 * Attr
 * 
 * Creates an encapsulated, chainable attribute that are validated by 
 * user-specified validation functions and can be attached to an arbitrary
 * JavaScript object. They can also call user-specified listeners upon being
 * accessed or changed.
 *
 * Jermaine models hold and manipulate Attr (and AttrList) objects until they
 * are attached to an object.
 */

/*!
 *
 * Notes and ToDos:
 * + what about isNotGreaterThan()?, isNotLessThan()?  Or, better still: a
 *   general 'not' operator, as in jasmine?
 *
 * + Attr should be decoupled from AttrList, see the clone() method
 *
 * + See issue 24 on github
 */
"use strict";
 
var Attr = function (name) {
    var AttrList = require('./attr_list.js'),
        Validator = require('./validator.js');

    var validators = [],
        that = this,
        errorMessage = "invalid setter call for " + name,
        defaultValueOrFunction,
        i,
        prop,
        addValidator,
        immutable = false,
        validator,
        listeners = {};

    // check for errors with constructor parameters
    if (name === undefined || typeof(name) !== 'string') {
        throw new Error("Attr: constructor requires a name parameter " +
                        "which must be a string");
    }

    // set up the validator that combines all validators
    validator = function (thingBeingValidated) {
        for (i = 0; i < validators.length; ++i) {
            validators[i](thingBeingValidated);
        }
        return true;
    };


    ////////////////////////////////////////////////////////////////////////
    /////////////////////////// MODIFIERS //////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * Validate this attribute with the given validator. This also allows
     * this.message to be overridden to specify the error message on
     * validation failure.
     *
     * Examples:
     *
     *     age.validatesWith(function (age) {
     *         this.message = "age must be between 18 and 99, " + age +
     *                        " fails.";
     *         return age >= 18 && age <= 99;
     *     });
     *
     *     name.validatesWith(function (name) {
     *         this.message = "name must be a string and contain at least" +
     *                        " 3 letters, " + name + " fails.";
     *         return typeof(name) === "string && name.length >= 3;
     *     });
     *
     *
     * @param {Function} returns true if the argument passes validation 
     */
    this.validatesWith = function (v) {
        if (typeof(v) === 'function') {
            validators.push(new Validator(v));
            return this;
        } else {
            throw new Error("Attr: validator must be a function");
        }
    };

    /**
     * Assign a default value to all attributes of this type. The default
     * value may be an explicit value or object, or it may be a function
     * that returns a default value.
     *
     * Examples:
     *
     * @param {value} the explicit default value, or a function that
     *                returns the default value
     */
    this.defaultsTo = function (value) {
        defaultValueOrFunction = value;
        return this;
    };

    /**
     * Make this attribute read-only. If a setter is called on this
     * attribute, it will throw an error
     *
     * Examples:
     */
    this.isReadOnly = function () {
        immutable = true;
        return this;
    };

    /**
     * Make this attribute writable. Note that this is the default for all 
     * attributes, but this may be called if an attribute has been set to
     * read only and then needs to be changed back
     *
     * Examples:
     */
    this.isWritable = function () {
        immutable = false;
        return this;
    };

    /**
     * Sets up a listener for 'sets' or 'gets' to this attribute. It throws
     * an error if the event is not "set" or "get", and if a setter is
     * already set up for the event, it overrides it.
     *
     * Examples:
     *
     * @param {event} String that can only be "set" or "get"
     * @param {listener} Function that is called when the event occurs
     */
    this.on = function (event, listener) {
        if (event !== "set" && event !== "get") {
            throw new Error("Attr: first argument to the 'on' method " +
                            "should be 'set' or 'get'");
        } else if (typeof(listener) !== "function") {
            throw new Error("Attr: second argument to the 'on' method " +
                            "should be a function");
        } else {
            listeners[event] = listener;
        }
    };

    ////////////////////////////////////////////////////////////////////////
    /////////////////////////// END MODIFIERS //////////////////////////////
    ////////////////////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////
    /////////////////////// GETTERS ////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * Returns the name of this attribute
     */
    this.name = function () {
        return name;
    };

    /**
     * Returns a function that combines all of the validators into
     * a single function that returns true or false.
     */
    this.validator = function () {
        return validator;
    };

    ////////////////////////////////////////////////////////////////////////
    /////////////////////// END GETTERS ////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////
    /////////////////////// SYNTACTIC SUGAR ////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * An alias for this object, for readability when calling multiple
     * modifiers
     *
     * Examples:
     */
    this.and = this;

    /**
     * An alias for this object, for readability.
     *
     * Examples:
     */
    this.which = this;

    /**
     * An alias for isReadOnly
     */
    this.isImmutable = this.isReadOnly;

    /**
     * An alias for isWritable
     */
    this.isMutable = this.isWritable;

    ////////////////////////////////////////////////////////////////////////
    /////////////////////// END SYNTACTIC SUGAR ////////////////////////////
    ////////////////////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////
    /////////////////////// UTILITIES //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    /**
     * Returns an attribute with the same modifiers, defaultValue, and
     * validators. This is used in Jermaine's approach to inheritance.
     *
     * Examples:
     */
    this.clone = function () {
        var result,
            i;

        // set the result to the default attribute or attribute list
        // TODO: figure out how to make this work without explicitly
        //       knowing about AttrList so it can be decoupled from this
        //       code
        result = this instanceof AttrList?new AttrList(name):new Attr(name);

        // add this attributes validators to the new attribute
        for (i = 0; i < validators.length; ++i) {
            result.validatesWith(validators[i]);
        }

        // set up the same default for the new attribute
        result.defaultsTo(defaultValueOrFunction);

        // if the this attr is immutable, the cloned attr should also be
        // immutable
        if (immutable) {
            result.isImmutable();
        }

        return result;
    };

    /**
     * This attaches the attribute to a concrete object. It adds the
     * getter/setter function to the object, and captures the actual
     * value of the attribute in a closure.
     *
     * The resulting getter/setter calls all validators on the parameter
     * and calls the appropriate listener on this attribute. It also
     * returns the object itself so that attribute setters can be chained.
     *
     * Examples:
     *
     * @param {obj} the object to which this attribute will be attached
     */
    this.addTo = function (obj) {
        var attribute,
            listener,
            defaultValue;

        if (!obj || typeof(obj) !== 'object') {
            throw new Error("Attr: addAttr method requires an object " +
                            "parameter");
        }

        // This is the attribute getter/setter method that gets addded to
        // the object
        obj[name] = function (newValue) {
            var preValue;

            if (newValue !== undefined) {
                // setter
                if (immutable && attribute !== undefined) {
                    throw new Error("cannot set the immutable property " +
                                    name + " after it has been set");
                } else if (!validator(newValue)) {
                    throw new Error(errorMessage);
                } else {
                    // get the oldValue
                    preValue = attribute;

                    // first set the value
                    attribute = newValue;

                    // call the set listener
                    if (listeners.set !== undefined) {
                        listeners.set.call(obj, newValue, preValue);
                    }
                }
                return obj;
            } else {
                // call the get listener
                if (listeners.get !== undefined) {
                    listeners.get.call(obj, attribute);
                }
                return attribute;
            }
        };


        // assign the default value, depends on whether it is a function
        // or an explicit value
        defaultValue = typeof(defaultValueOrFunction) === 'function'?
            defaultValueOrFunction():
            defaultValueOrFunction;

        // call the setter with the defaultValue upon attaching it to the
        // object
        if (defaultValue !== undefined && validator(defaultValue)) {
            obj[name](defaultValue);
        } else if (defaultValue !== undefined && !validator(defaultValue)) {
            throw new Error("Attr: Default value of " + defaultValue +
                            " does not pass validation for " + name);
        }
    };

    ////////////////////////////////////////////////////////////////////////
    /////////////////////// END UTILITIES //////////////////////////////////
    ////////////////////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////
    /////////////////////// VALIDATOR RELATED //////////////////////////////
    ////////////////////////////////////////////////////////////////////////

    // add a single validator object to the attribute
    addValidator = function (name) {
        that[name] = function (param) {
            validators.push(Validator.getValidator(name)(param));
            return that;
        };
    };

    // the Validator object contains several default validators
    // that need to be attached to all Attrs
    for (i = 0; i < Validator.validators().length; ++i) {
        addValidator(Validator.validators()[i]);
    }

    ////////////////////////////////////////////////////////////////////////
    /////////////////////// END VALIDATOR RELATED //////////////////////////
    ////////////////////////////////////////////////////////////////////////
};

module.exports = Attr;

},{"./attr_list.js":5,"./validator.js":8}],5:[function(require,module,exports){
"use strict";

var Attr = require('./attr.js');

var AttrList = function(name) {
    var that = this,
        listeners = {};


    //this is where the inheritance happens now
    Attr.call(this, name);

    var delegate = function (obj, func) {
        return function () { return obj[func].apply(obj, arguments); };
    };

    //syntactic sugar to keep things grammatically correct
    this.validateWith = this.validatesWith;

    //disable defaultsTo and isImmutable until we figure out how to make it make sense
    this.defaultsTo = function () {
        //no op
    };

    this.isImmutable = function () {
        //no op
    };

    this.isMutable = function () {
        //no op
    };

    this.eachOfWhich = this;

    this.on = function (event, listener) {
        if (event !== "add") {
            throw new Error("AttrList: 'on' only responds to 'add' event");
        }

        if (typeof(listener) !== "function") {
            throw new Error("AttrList: 'on' requires a listener function as the second parameter");
        }

        listeners[event] = listener;
    };


    this.addTo = function (obj) {
        var prop,
            arr = [],
            actualList = {};
        if(!obj || typeof(obj) !== 'object') {
            throw new Error("AttrList: addTo method requires an object parameter");                
        } else {
            actualList.pop = delegate(arr, "pop");
            
            actualList.add = function (item) {
                if ((that.validator())(item)) {
                    arr.push(item);
                    if (listeners.add !== undefined) {
                        //listeners.add.call();
                        listeners.add.call(obj, item, actualList.size());
                    }
                    return this;         
                } else {
                    throw new Error(that.errorMessage());
                }
            };

            actualList.replace = function (index, obj) {
                if ((typeof(index) !== 'number') || (parseInt(index, 10) !== index)) {
                    throw new Error("AttrList: replace method requires index parameter to be an integer");
                }

                if (index < 0 || index >= this.size()) {
                    throw new Error("AttrList: replace method index parameter out of bounds");
                }

                if (!(that.validator())(obj)) {
                    throw new Error(that.errorMessage());
                }

                arr[index] = obj;
                return this;
            };

            actualList.at = function (index) {
                if (index < 0 || index >= this.size()) {
                    throw new Error("AttrList: Index out of bounds");
                }
                return arr[index];
            };

            //to keep things more java-y
            actualList.get = actualList.at;

            actualList.size = function () {
                return arr.length;
            };

            actualList.toJSON = function (JSONreps) {
                var result = [], 
                    i, j;

                //check to make sure the current list is not in JSONreps
                if (JSONreps !== undefined) {
                    for (i = 0;i < JSONreps.length; ++i) {
                        if (JSONreps[i].object === this) {
                            result = JSONreps[i].JSONrep;
                        }
                    }
                }
                
                for (i = 0; i < arr.length; ++i) {
                    if (arr[i].toJSON) {
                        result.push(arr[i].toJSON(JSONreps));
                    } else {
                        result.push(arr[i]);
                    }
                }
                return result;
            };

            obj[name] = function () {
                return actualList;
            };
        }
    };
};

// //this needs to stay if we're going to use instanceof
// //but note we override all of the methods via delegation
// //so it's not doing anything except for making an AttrList
// //an instance of Attr
//AttrList.prototype = new Attr(name);
AttrList.prototype = new Attr("???");

module.exports = AttrList;

},{"./attr.js":4}],6:[function(require,module,exports){
"use strict";

var Method = function (name, method) {
    if (!name || typeof(name) !== "string") { 
        throw new Error("Method: constructor requires a name parameter which must be a string");
    } else if (!method || typeof(method) !== "function") {
        throw new Error("Method: second parameter must be a function");
    }
    
    this.addTo = function (obj) {
        if (!obj || typeof(obj) !== 'object') {
            throw new Error("Method: addTo method requires an object parameter");
        }
        
        obj[name] = method;
    };
};

module.exports = Method;

},{}],7:[function(require,module,exports){
"use strict";

require('../util/index_of.js');

var models = {};

/**
 * this function return a model associated with a name
 */
var getModel = function (name) {
    if (typeof(name) !== "string") {
        throw new Error("Jermaine: argument to getModel must be a string");
    }

    if (models[name] === undefined) {
        throw new Error("No model by the name of " + name + " found");
    } else {
        return models[name];
    }
};

/**
 * this function returns an array of all model names stored by
 * jermaine
 */
var getModels = function (name) {
    var model,
        result = [];
    
    for (model in models) {
        result.push(model);
    }
    return result;
};

/**
 * This is the model constructor
 */

var Model = function (specification) {
    var methods = {},
        attributes = {},
        pattern,
        modelName,
        modified = true,
        requiredConstructorArgs = [],
        optionalConstructorArgs = [],
        parents = [],
        Method = require('./method.js'),
        Attr = require('./attr.js'),
        AttrList = require('./attr_list.js'),
        EventEmitter = require('../util/event_emitter.js'),
        property,
        listProperties,
        updateConstructor,
        isImmutable,
        initializer = function () {},
        constructor = function () {},
        model = function () {
            if (modified) {
                //validate the model if it has been modified
                model.validate();
                updateConstructor();
            }
            return constructor.apply(this, arguments);
        };

    if (arguments.length === 1) {
        if (typeof(specification) === "string") {
            modelName = specification;
            specification = undefined;
        }
    }

    if (arguments.length > 1) {
        modelName = specification;
        specification = arguments[arguments.length-1];
    }

    //handle specification function
    if (specification && typeof(specification) === "function") {
        model = new Model(modelName);
        specification.call(model);
        return model;
    } else if (specification) {
        throw new Error("Model: specification parameter must be a function");
    }

    //handle model name
    if (modelName !== undefined && typeof(modelName) === "string") {
        models[modelName] = model;
    } else if (modelName !== undefined) {
        throw new Error("Model: model name must be a string");
    }

    
    /********** BEGIN PRIVATE METHODS ****************/
    /* private method that abstracts hasA/hasMany */
    var hasAProperty = function (type, name) {
        var Property,
            methodName,
            attribute;

        //Property is one of Attr or AttrList
        Property = type==="Attr"?Attr:AttrList;

        //methodName is either hasA or hasMany
        methodName = type==="Attr"?"hasA":"hasMany";

        modified = true;
        
        if (typeof(name) === 'string') {
            attribute = new Property(name);
            attributes[name] = attribute;
            return attribute;
        } else {
            throw new Error("Model: " + methodName + " parameter must be a string");
        }
    };

    /* private method that abstracts attribute/method */
    property = function (type, name) {
        var result;

        if (typeof(name) !== "string") {
            throw new Error("Model: expected string argument to " + type + " method, but recieved " + name);
        }

        result = type==="attribute" ? attributes[name] : methods[name];

        if (result === undefined) {
            throw new Error("Model: " + type + " " + name  + " does not exist!");
        }

        return result;
    };

    /* private method that abstracts attributes/methods */
    listProperties = function (type) {
        var i,
            list = [],
            properties = type==="attributes"?attributes:methods;

        for (i in properties) {
            if (properties.hasOwnProperty(i)) {
                list.push(i);
            }
        }

        return list;
    };

    /* private function that updates the constructor */
    updateConstructor = function () {
        constructor = function () {
            var i, j,
                err,
                attribute,
                attributeList = model.attributes(), 
                methodList = model.methods(), 
                emitter = new EventEmitter(),
                attr,
                attrChangeListeners = {},
                changeHandler,
                addProperties,
                that = this;

            if (!(this instanceof model)) {
                if (arguments.length > 0) {
                    //bad form, but hopefully temporary
                    /*jshint newcap:false */
                    return new model(arguments);
                } else {
                    //bad form, but hopefully temporary
                    /*jshint newcap:false */
                    return new model();
                }
                //throw new Error("Model: instances must be created using the new operator");
            }


            ////////////////////////////////////////////////////////////////
            ////////////// PUBLIC API FOR ALL INSTANCES ////////////////////
            ////////////////////////////////////////////////////////////////

            // this is a method associated with unit test
            // it("should not increment the listeners associated with the last object created"
            // it has been removed now that the bug has been fixed
            /*this.attrChangeListeners = function () {
             return attrChangeListeners;
             };*/

            /**
             * Returns the EventEmitter associated with this instance.
             *
             */
            this.emitter = function () {
                return emitter;
            };

            /**
             * Wrapper methods added to the internal EventEmitter object
             * 
             */

            this.emitter().removeJermaineChangeListener = function (attrName, obj) {
                if (typeof(attrName) !== "string") {
                    throw new Error("attrName must be a string");
                } else if (typeof(obj) !== "object" || obj.toJSON === undefined ||
                           obj.emitter === undefined) {
                    throw new Error("obj must be a jermaine object");
                } else {
                    obj.emitter().removeListener("change", attrChangeListeners[attrName]);
                }
            };

            this.emitter().addJermaineChangeListener = function (attrName, obj) {
                if (typeof(attrName) !== "string") {
                    throw new Error("attrName must be a string");
                } else if (typeof(obj) !== "object" || obj.toJSON === undefined ||
                           obj.emitter === undefined) {
                    throw new Error("obj must be a jermaine object");
                } else {
                    if (attrChangeListeners[attrName] === undefined) {
                        attrChangeListeners[attrName] = function (data) {
                            var newData = [],
                                emit = true;
                            
                            for (i = 0; i < data.length && emit === true; ++i) {
                                newData.push(data[i]);
                                if (data[i].origin === that) {
                                    emit = false;
                                }
                            }
                            
                            if (emit) {
                                newData.push({key:attrName, origin:that});
                                that.emit("change", newData);
                            }
                        };
                        
                    }
                    obj.emitter().on("change", attrChangeListeners[attrName]);
                }
            };


            /**
             * Registers a listener for this instance's changes.
             *
             */
            this.on = this.emitter().on;

            /**
             * Emits an event
             */
            this.emit = this.emitter().emit;

            /**
             * Returns a JSON representation of this instance.
             *
             */
            this.toJSON = function (JSONreps) {
                var attributeValue,
                    i, j,
                    thisJSONrep = {},
                    attributeJSONrep;

                if (JSONreps === undefined) {
                    // first call
                    JSONreps = [];
                    JSONreps.push({object:this, JSONrep:thisJSONrep});
                } else if (typeof(JSONreps) !== "object") {
                    // error condition 
                    throw new Error("Instance: toJSON should not take a parameter (unless called recursively)");
                } else {
                    // find the current JSON representation of this object, if it exists
                    for (i = 0; i < JSONreps.length; ++i) {
                        if (JSONreps[i].object === this) {
                            thisJSONrep = JSONreps[i].JSONrep;
                        }
                    }
                }

                for (i = 0; i < attributeList.length; ++i) {
                    attributeJSONrep = null;
                    // get the attribute
                    attributeValue = this[attributeList[i]]();
                    
                    // find the current JSON representation for the attribute, if it exists
                    for (j = 0; j < JSONreps.length; ++j) {
                        if (JSONreps[j].object === attributeValue) {
                            attributeJSONrep = JSONreps[j].JSONrep;
                        }
                    }

                    if (attributeValue !== undefined && attributeValue !== null && attributeValue.toJSON !== undefined && attributeJSONrep === null) {
                        // create a new entry for the attribute
                        attributeJSONrep = (attributes[attributeList[i]] instanceof AttrList)?[]:{};
                        JSONreps.push({object:attributeValue, JSONrep:attributeJSONrep});
                        JSONreps[JSONreps.length-1].JSONrep = attributeValue.toJSON(JSONreps);
                    }

                    // fill out the JSON representation for this object
                    if(attributeJSONrep === null) {
                        thisJSONrep[attributeList[i]] = attributeValue;
                    } else {
                        thisJSONrep[attributeList[i]] = attributeJSONrep;
                    }
                }
                return thisJSONrep;
            };

            /**
             * Returns a String representation of this instance
             *
             */
            this.toString = (pattern !== undefined)?pattern:function () {
                return "Jermaine Model Instance";
            };


            ////////////////////////////////////////////////////////////////
            ////////////// END PUBLIC API FOR ALL INSTANCES ////////////////
            ////////////////////////////////////////////////////////////////


            /**
             * This is a private method that sets up handling for the setter
             * It attaches a change listener on new objects
             * and it removes the change listener from old objects
             */
            changeHandler = function (attr) {
                if (!(attr instanceof AttrList)) {
                    //when set handler is called, this should be the current object
                    attr.on("set", function (newValue, preValue) {
                        // if preValue is a model instance, we need to remove the listener from it
                        if (preValue !== undefined && preValue !== null && preValue.on !== undefined &&
                            preValue.toJSON !== undefined && preValue.emitter !== undefined) {
                            // we now assume preValue is a model instance
                            
                            // sanity check 1
                            if (preValue.emitter().listeners("change").length < 1) {
                                throw new Error("preValue should always have a listener defined if it is a model");
                            }
                            
                            this.emitter().removeJermaineChangeListener(attr.name(), preValue);
                        }
                        
                        // if newValue is a model instance, we need to attach a listener to it
                        if (newValue !== undefined && newValue !== null && newValue.on !== undefined &&
                            newValue.toJSON !== undefined && newValue.emitter !== undefined) {
                            // we now assume newValue is a model instance
                            
                            // attach a listener
                            this.emitter().addJermaineChangeListener(attr.name(), newValue);
                        }

                        // finally emit that a change has happened
                        this.emit("change", [{key:attr.name(), value:newValue, origin:this}]);
                    });
                } else {
                    attr.on("add", function (newValue, newSize) {
                        this.emit("change", [{action:"add", key:attr.name(), value:newValue, origin:this}]);
                    });
                }
            };

            //set up event handling for sub objects
            for (i = 0; i < attributeList.length;  ++i) {
                attr = model.attribute(attributeList[i]);

                // temporarily not adding handlers to attr lists
                // until we get the bugs sorted out
                // see model test "should not add change listeners to attr list"
                //if (!(attr instanceof AttrList)) {
                changeHandler.call(this, attr);
                //}
            }


            // add all of the attributes and the methods to the object
            for (i = 0; i < attributeList.length + methodList.length; ++i)  {
                if (i < attributeList.length) {
                    //if the object is immutable, all attributes should be immutable
                    if (isImmutable) {
                        model.attribute(attributeList[i]).isImmutable();
                    }
                    model.attribute(attributeList[i]).addTo(this);
                } else {
                    model.method(methodList[i-attributeList.length]).addTo(this);
                }
            }

            // build the object using the constructor arguments
            if(arguments.length > 0) {
                if (arguments.length < requiredConstructorArgs.length) {
                    //construct and throw error
                    err = "Constructor requires ";
                    for(i = 0; i < requiredConstructorArgs.length; ++i) {
                        err += requiredConstructorArgs[i];
                        err += i===requiredConstructorArgs.length-1?"":", ";
                    }
                    err += " to be specified";
                    throw new Error(err);
                } if (arguments.length > requiredConstructorArgs.length + optionalConstructorArgs.length) {
                    throw new Error("Too many arguments to constructor. Expected " + requiredConstructorArgs.length + " required arguments and " +
                                    optionalConstructorArgs.length + " optional arguments");
                }
                else {
                    for (i = 0; i < arguments.length; ++i) {
                        attribute = i < requiredConstructorArgs.length?
                            requiredConstructorArgs[i]:
                            optionalConstructorArgs[i-requiredConstructorArgs.length];

                        if (model.attribute(attribute) instanceof AttrList) {
                            //make sure that arguments[i] is an array
                            if (Object.prototype.toString.call(arguments[i]) !== "[object Array]") {
                                throw new Error("Model: Constructor requires 'names' attribute to be set with an Array");
                            } else {
                                //iterate over the array adding the elements
                                for (j = 0; j < arguments[i].length; ++j) {
                                    this[attribute]().add(arguments[i][j]);
                                }
                            }
                        } else {
                            //go ahead and set it like normal
                            this[attribute](arguments[i]);
                        }
                    }
                }
            }

            // finally, call the initializer
            initializer.call(this);
        };
    };
    /*********** END PRIVATE METHODS **************/


    /*********** BEGIN PUBLIC API *****************/
    model.hasA = function (attr) {
        return hasAProperty("Attr", attr);
    };
    
    model.hasAn = model.hasA;
    model.hasSome = model.hasA;
    
    model.hasMany = function (attrs) {
        return hasAProperty("AttrList", attrs);
    };

    model.isA = function (parent) {
        var i,
            parentAttributes,
            parentMethods,
            isAModel;

        modified = true;

        //checks to make sure a potentialModel has all attributes of a model
        isAModel = function (potentialModel) {
            var i,
                M = new Model();
            for (i in M) {
                if (M.hasOwnProperty(i) && typeof(potentialModel[i]) !== typeof(M[i])) {
                    return false;
                }
            }
            return true;
        };

        //confirm parent is a model via duck-typing
        if (typeof (parent) !== "function" || !isAModel(parent)) {
            throw new Error("Model: parameter sent to isA function must be a Model");
        }

        //only allow single inheritance for now
        if (parents.length === 0) {
            parents.push(parent);
        } else {
            throw new Error("Model: Model only supports single inheritance at this time");
        }

        //add attributes and methods to current model
        parentAttributes = parents[0].attributes();
        for (i = 0; i < parentAttributes.length; ++i) {
            if (attributes[parentAttributes[i]] === undefined) {
                attributes[parentAttributes[i]] = parents[0].attribute(parentAttributes[i]).clone();
                //subclass attributes are mutable by default
                attributes[parentAttributes[i]].isMutable();
            }
        }

        parentMethods = parents[0].methods();
        for (i = 0; i < parentMethods.length; ++i) {
            if (methods[parentMethods[i]] === undefined) {
                methods[parentMethods[i]] = parents[0].method(parentMethods[i]);
            }
        }            

        for (i = 0; i < parents.length; i++) {
            model.prototype = new parents[i]();
        }
    };

    model.isAn = model.isA;

    model.parent = function () {
        return parents[0].apply(this, arguments);
    };

    model.attribute = function (attr) {
        return property("attribute", attr);
    };

    model.attributes = function () {
        return listProperties("attributes");
    };

    model.method = function (m) {
        return property("method", m);
    };
    
    model.methods = function () {
        return listProperties("methods");
    };

    model.isBuiltWith = function () {
        var optionalParamFlag = false,
            i;

        modified = true;
        requiredConstructorArgs = [];
        optionalConstructorArgs = [];

        for (i = 0; i < arguments.length; ++i) {
            if (typeof(arguments[i]) === "string" && arguments[i].charAt(0) !== '%') {
                //in required parms
                if (optionalParamFlag) {
                    //throw error
                    throw new Error("Model: isBuiltWith requires parameters preceded with a % to be the final parameters before the optional function");
                } else {
                    //insert into required array
                    requiredConstructorArgs.push(arguments[i]);
                }
            } else if(typeof(arguments[i]) === "string" && arguments[i].charAt(0) === '%') {
                //in optional parms
                optionalParamFlag = true;
                //insert into optional array
                optionalConstructorArgs.push(arguments[i].slice(1));
            } else if(typeof(arguments[i]) === "function" && i === arguments.length - 1) {
                //init function
                initializer = arguments[i];
            } else {
                throw new Error("Model: isBuiltWith parameters must be strings except for a function as the optional final parameter");
            }
        }
    };
    
    model.isImmutable = function () {
        isImmutable = true;
    };

    model.looksLike = function (p) {
        modified = true;
        pattern = p;
    };

    model.respondsTo = function (methodName, methodBody) {
        var m = new Method(methodName, methodBody);
        modified = true;
        methods[methodName] = m;
    };
    
    model.validate = function () {
        var i,
            attributes = this.attributes(),
            methods = this.methods();

        //check to make sure that isBuiltWith has actual attributes
        for (i = 0; i < requiredConstructorArgs.length; ++i) {
            try {
                this.attribute(requiredConstructorArgs[i]);
            } catch (e) {
                throw new Error(requiredConstructorArgs[i] + ", specified in the isBuiltWith method, is not an attribute");
            }
        }

        for (i = 0; i < optionalConstructorArgs.length; ++i) {
            try {
                this.attribute(optionalConstructorArgs[i]);
            } catch (e) {
                throw new Error(optionalConstructorArgs[i] + ", specified in the isBuiltWith method, is not an attribute");
            }
        }

        //check for method/attribute collisions
        for (i = 0; i < attributes.length; i++) {
            if (methods.indexOf(attributes[i]) > -1) {
                throw new Error("Model: invalid model specification to " + attributes[i] + " being both an attribute and method");
            }
        }

        //check to make sure that all attributes are requiredConstructorArgs if the object is immutable
        if (isImmutable) {
            for (i = 0; i < attributes.length; i++) {
                if (requiredConstructorArgs.indexOf(attributes[i]) < 0) {
                    throw new Error("immutable objects must have all attributes required in a call to isBuiltWith");
                }
            }
        }

        //set modifiedSinceLastValidation to false
        modified = false;
    };
    /************** END PUBLIC API ****************/
    
    //here we are returning our model object
    //which is a function with a bunch of methods that
    //manipulate how the function behaves
    return model;
};

//ns.getModel = getModel;
//ns.getModels = getModels;

Model.getModel = getModel;
Model.getModels = getModels;

module.exports = Model;



},{"../util/event_emitter.js":10,"../util/index_of.js":11,"./attr.js":4,"./attr_list.js":5,"./method.js":6}],8:[function(require,module,exports){
/**
 * Validator
 * 
 * Creates a named function that can be attached to attribute for validation.
 * The Validator function allows for customization of the thrown error message.
 *
 * This source file also handles all default validators that come packaged with
 * Jermaine. This includes isA, isOneOf, isGreaterThan, isLessThan, etc.
 *
 * Simple example:
 *
 * isGreaterThan = new Validator(function (number) {
 *     //this.message points to the error message
 *     //that will be thrown
 *     this.message = "Validation Error: " + 
 *                    this.param + " should be greater than " + number;
 *
 *     //this.param points to the actual parameter sent to the validator
 *     //return true if the validation passes, false otherwise
 *     return this.param > number;
 * });
 *
 * Later, a validator can be attached to the attribute object.
 *
 * Attr.isGreaterThan = isGreaterThan;
 *
 * and can be used when creating attributes:
 *
 * var age = new Attr("age").which.isGreaterThan(0);
 *
 */

"use strict";

require('../util/index_of.js');

var Model = require('./model.js');

var validators = {};  //the set of static validators

/**
 * Validator 'Constructor'
 *
 * This simply returns a validation function that handles the custom error
 * message and can be attached to an attribute. So it's not really
 * technically a constructor. This is only important to know so that you
 * don't try something like this:
 *
 * var v = new Validator( ... );
 * 
 * //this will always fail, bc v is not an object
 * if (v instanceof Validator) { ... }
 * 
 * The spec function is just a specification for the validator. It allows
 * for a couple of things to be attached to "this" that will be used
 * in the return function. This includes "this.message" and "this.param".
 * The message is the error string that is thrown on failure and
 * this.param is the actual parameter that gets sent in to be validated.
 */
var Validator = function (spec) {
    // this is the actual function that is returned
    var validatorFunction = function (arg) {
        var result, 
            resultObject = {},
            errorMessage;

        // spec is called on the argument with 'this' pointing
        // to an empty object (resultObject),
        // note the validator will return either true or false
        result = spec.call(resultObject, arg);

        // if it's false, the parameter has failed validation
        if (!result) {
            // throw the error
            errorMessage = resultObject.message ||
                "validator failed with parameter " + arg;
            throw new Error(errorMessage);
        }
        return result;
    };

    // see? all that's being returned is a function
    // also note that since 'this' is never used,
    // we can call this constructor with or without 'new'
    return validatorFunction;
};

/**
 * This static function adds a named validator to the list of
 * validators. The second argument is a validation function
 * that simply returns a Validator function created as above.
 *
 * The nice thing about adding a Validator this way is that
 * you can actually validate the parameter sent to the validator!
 * Why might that be important? Well, consider the following:
 *
 * var isGreaterThanInteger = new Validator(function (val) {
 *     this.message = this.param + " should be greater than " + val;
 *     return this.param > val;
 * });
 *
 * Now we can call isGreaterThanNumber like this:
 *
 * isGreaterThanNumber(5)(6); // will pass validation
 * isGreaterThanNumber(5)(3); // will throw
 * isGreaterThanNumber("dog")(3); // ???
 *
 * So we need to confirm that the user sends in an integer as a parameter.
 * You might want to try something like this:
 *
 * var isGreaterThanInteger = new Validator(function (val) {
 *     if (typeof(val) !== "number") throw Error("Not cool!");
 *     this.message = this.param + " should be greater than " + val;
 *     return this.param > val;
 * });
 *
 * This will actually work on the example above:
 *
 * isGreaterThanNumber("dog")(3); // throws error now
 *
 * The problem is that with Jermaine, we create the validator
 * and then don't actually call it until an attribute is about to be
 * set. So, in other words:
 *
 * var a = new Attr("thing").which.isGreaterThanNumber("dog"); //no error (yet)
 *
 * will not cause an error until it's attached to an object and thing
 * is attempted to be set.
 *
 * So a temporary workaround is to validate the validator in the
 * addValidator function below. That's handled by the argValidator
 * validator. (Phew, this is getting really meta)
 *
 * I'm not sure this is the best solution. Seems like there should be
 * a way to validate the argument in the constructor function, but
 * that might require some rewiring that breaks multigraph. This is
 * the best I could come up with for now.
 *
 * @name The name of the validator for the attribute, must be a string
 *       or an error will be thrown
 *
 * @v The validator specification (returns a boolean)
 *    must be a function or an error will be thrown
 *
 * @argValidator optional function that checks the types of args sent
 *           to the validator, must be a function or an error will be thrown
 *
 * So an error will be thrown in the cases that "name" is not a string,
 * v is not a function, argValidator is not a function, or if the static
 * validator is already defined.
 */
Validator.addValidator = function (name, v, argValidator) {
    if (name === undefined || typeof(name) !== "string") {
        throw new Error("addValidator requires a name to be specified as the first parameter");
    }

    if (v === undefined || typeof(v) !== "function") {
        throw new Error("addValidator requires a function as the second parameter");
    }

    // optional third argument to validate the 
    // expected value that gets sent to the validator
    // for example, isA("number") works but isA("nmber")
    // doesn't work
    if (argValidator !== undefined && typeof(argValidator) !== "function") {
        throw new Error("addValidator third optional argument must be a "+
                        "function");
    }

    if (validators[name] === undefined) {
        validators[name] = function (expected) {
            if (argValidator !== undefined) {
                if (!argValidator(expected)) {
                    throw new Error ("Validator: Invalid argument for " +
                                     name + " validator");
                }
            }
            return new Validator(function (val) {
                var resultObject = {"actual":val, "param":val},
                    result = v.call(resultObject, expected);
                this.message = resultObject.message;
                return result;
            });
        };
    } else {
        throw new Error("Validator '" + name +"' already defined");
    }
};


/**
 * Get the built-in validator by its name.
 *
 * @name a string representing the name of the validator to return
 * 
 * throws an error if name is not a string
 */
Validator.getValidator = function (name) {
    var result;

    if (name === undefined) {
        throw new Error("Validator: getValidator method requires a string parameter");
    } else if (typeof (name) !== "string") {
        throw new Error("Validator: parameter to getValidator method must be a string");
    }

    result = validators[name];

    if (result === undefined) {
        throw new Error("Validator: '" + name + "' does not exist");
    }

    return result;
};



/**
 * return an array of of static validator names
 */
Validator.validators = function () {
    var prop,
        result = [];
    for (prop in validators) {
        if (validators.hasOwnProperty(prop)) {
            result.push(prop);
        }
    }

    return result;
};

/**
 * Built-In validators. Hopefully these are self-explanatory
 * Will document them more later.
 */
Validator.addValidator("isGreaterThan", function (val) {
    this.message = this.param + " should be greater than " + val;
    return this.param > val;
});

Validator.addValidator("isLessThan", function (val) {
    this.message = this.param + " should be less than " + val;
    return this.param < val;
});


// TODO: add array validation for val
Validator.addValidator("isOneOf", function (val) {
    this.message = this.param + " should be one of the set: " + val;
    return val.indexOf(this.param) > -1;
});

/**
 * This one is the only one that uses an argument validator. It confirms
 * that the argument is a primitive javascript type or a named Jermaine
 * model.
 */
Validator.addValidator("isA", function (val) {
    var types = ["string", "number", "boolean", "function", "object"],
        models = Model.getModels();
    if (typeof(val) === "string" && types.indexOf(val) > -1) {
        this.message = this.param + " should be a " + val;
        return typeof(this.param) === val;
    } else if (typeof(val) === "string" && models.indexOf(val) > -1) {
        this.message = "parameter should be an instance of " + val;
        return this.param instanceof Model.getModel(val);
    } else if (val === 'integer') {
        // special case for 'integer'; since javascript has no integer type,
        // just check for number type and check that it's numerically an int
        if (this.param.toString !== undefined)  {
            this.message = this.param.toString() + " should be an integer";
        } else {
            this.message = "parameter should be an integer";
        }
        return (typeof(this.param) === 'number') && (parseInt(this.param,10) === this.param);
    } /*else if (typeof(val) === "string") {
       throw new Error("Validator: isA accepts a string which is one of " + types);
       } else {
       throw new Error("Validator: isA only accepts a string for a primitive types for the time being");
       }*/
},
                       //argument validator
                       function (val) {
                           var typesAndModels = ["string", "number", "boolean", "function",
                                                 "object", "integer"].concat(Model.getModels());
                           return typesAndModels.indexOf(val) >= 0;
                       });


// grammatical alias for isA
validators.isAn = validators.isA;

module.exports = Validator;

},{"../util/index_of.js":11,"./model.js":7}],9:[function(require,module,exports){
require('./util/index_of.js');

var Model = require('./core/model.js');

module.exports = {
    'Attr'      : require('./core/attr.js'),
    'AttrList'  : require('./core/attr_list.js'),
    'Model'     : Model,
    'getModel'  : Model.getModel,
    'getModels' : Model.getModels,
    'Validator' : require('./core/validator.js'),
    'Method'    : require('./core/method.js'),
    'util'      : {
        'EventEmitter' : require('./util/event_emitter.js'),
        'namespace'    : require('./util/namespace.js')
    }
};

},{"./core/attr.js":4,"./core/attr_list.js":5,"./core/method.js":6,"./core/model.js":7,"./core/validator.js":8,"./util/event_emitter.js":10,"./util/index_of.js":11,"./util/namespace.js":12}],10:[function(require,module,exports){
"use strict";

require('./index_of.js');

var EventEmitter = function () {
    var that = this,
        listeners = {};

    //an registers event and a listener
    this.on = function (event, listener) {
        if (typeof(event) !== "string") {
            throw new Error("EventEmitter: first argument to 'on' should be a string");
        }
        if (typeof(listener) !== "function") {
            throw new Error("EventEmitter: second argument to 'on' should be a function");
        }
        if (!listeners[event]) {
            listeners[event] = [];
        }
        listeners[event].push(listener);
        return that;
    };

    //alias addListener
    this.addListener = this.on;
    
    this.once = function (event, listener) {
        var f = function () {
            listener(arguments);
            that.removeListener(event, f);
        };

        that.on(event, f);
        return that;
    };

    this.removeListener = function (event, listener) {
        var index;

        if (typeof(event) !== "string") {
            throw new Error("EventEmitter: first parameter to removeListener method must be a string representing an event");
        }
        if (typeof(listener) !== "function") {
            throw new Error("EventEmitter: second parameter must be a function to remove as an event listener");
        }
        if (listeners[event] === undefined || listeners[event].length === 0) {
            throw new Error("EventEmitter: there are no listeners registered for the '" + event + "' event");
        }

        index = listeners[event].indexOf(listener);

        if (index !== -1) {
            //remove it from the list
            listeners[event].splice(index,1);
        }

        return that;
    };

    this.removeAllListeners = function (event) {
        if (typeof(event) !== "string") {
            throw new Error("EventEmitter: parameter to removeAllListeners should be a string representing an event");
        }

        if (listeners[event] !== undefined) {
            listeners[event] = [];
        }
        
        return that;
    };
    
    this.setMaxListeners = function (number) {
        return that;
    };

    //get the listeners for an event
    this.listeners = function (event) {
        if (typeof(event) !== 'string') {
            throw new Error("EventEmitter: listeners method must be called with the name of an event");
        } else if (listeners[event] === undefined) {
            return [];
        }
        return listeners[event];
    };

    //execute each of the listeners in order with the specified arguments
    this.emit = function (event, data) {
        var i,
            params;


        if (arguments.length > 1) {
            params = [];
        }

        for (i = 1; i < arguments.length; ++i) {
            params.push(arguments[i]);
        }

        if (listeners[event] !== undefined) {
            for (i = 0; i < listeners[event].length; i=i+1) {
                listeners[event][i].apply(this, params);
            }
        }
    };

    return that;
}; //end EventEmitter

module.exports = EventEmitter;

},{"./index_of.js":11}],11:[function(require,module,exports){
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (searchElement /*, fromIndex */ ) {
        "use strict";
        if (this === null) {
            throw new TypeError();
        }
        var t = Object(this);
        var len = t.length >>> 0;
        if (len === 0) {
            return -1;
        }
        var n = 0;
        if (arguments.length > 0) {
            n = Number(arguments[1]);
            if (n !== n) { // shortcut for verifying if it's NaN
                n = 0;
            } else if (n !== 0 && n !== Infinity && n !== -Infinity) {
                n = (n > 0 || -1) * Math.floor(Math.abs(n));
            }
        }
        if (n >= len) {
            return -1;
        }
        var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
        for (; k < len; k++) {
            if (k in t && t[k] === searchElement) {
                return k;
            }
        }
        return -1;
    };
}

module.exports = undefined;

},{}],12:[function(require,module,exports){
module.exports = function namespace (ns, aliases, func) {
    var nsRegExp = /^([a-zA-Z]+)(\.[a-zA-Z]*)*$/,
        nsArray,
        currentNS,
        i;

    //check to assure ns is a properly formatted namespace string
    if (ns.match(nsRegExp) === null || ns === "window") {
        throw new Error("namespace: " + ns + " is a malformed namespace string");
    }

    //check to assure that if alias is defined that func is defined
    if (aliases !== undefined && func === undefined) {
        if (typeof (aliases) === "function") {
            func = aliases;
            aliases = undefined;
        } else if (typeof (aliases) === "object") {
            throw new Error("namespace: if second argument exists, final function argument must exist");
        } else if (typeof (aliases) !== "object") {
            throw new Error("namespace: second argument must be an object of aliased local namespaces");
        }
    } else if (typeof (aliases) !== "object" && typeof (func) === "function") {
        throw new Error("namespace: second argument must be an object of aliased local namespaces");
    }

    //parse namespace string
    nsArray = ns.split(".");

    //set the root namespace to window (if it's not explictly stated)
    if (nsArray[0] === "window") {
        currentNS = window;
    } else {
        currentNS = (window[nsArray[0]] === undefined) ? window[nsArray[0]] = {} : window[nsArray[0]];
    }

    //confirm func is actually a function
    if (func !== undefined && typeof (func) !== "function") {
        throw new Error("namespace: last parameter must be a function that accepts a namespace parameter");
    }

    //build namespace
    for (i = 1; i < nsArray.length; i = i + 1) {
        if (currentNS[nsArray[i]] === undefined) {
            currentNS[nsArray[i]] = {};
        }
        currentNS = currentNS[nsArray[i]];
    }

    //namespaces.push(currentNS);
    //namespace = currentNS;

    //if the function was defined, but no aliases run it on the current namespace
    if (aliases === undefined && func) {
        func(currentNS);
    } else if (func) {
        for (i in aliases) {
            if (aliases.hasOwnProperty(i)) {
                aliases[i] = namespace(aliases[i]);
            }
        }
        func.call(aliases, currentNS);
    }

    //return namespace
    return currentNS;
};

},{}],13:[function(require,module,exports){
/*! jQuery v1.8.2 jquery.com | jquery.org/license */
(function(a,b){function G(a){var b=F[a]={};return p.each(a.split(s),function(a,c){b[c]=!0}),b}function J(a,c,d){if(d===b&&a.nodeType===1){var e="data-"+c.replace(I,"-$1").toLowerCase();d=a.getAttribute(e);if(typeof d=="string"){try{d=d==="true"?!0:d==="false"?!1:d==="null"?null:+d+""===d?+d:H.test(d)?p.parseJSON(d):d}catch(f){}p.data(a,c,d)}else d=b}return d}function K(a){var b;for(b in a){if(b==="data"&&p.isEmptyObject(a[b]))continue;if(b!=="toJSON")return!1}return!0}function ba(){return!1}function bb(){return!0}function bh(a){return!a||!a.parentNode||a.parentNode.nodeType===11}function bi(a,b){do a=a[b];while(a&&a.nodeType!==1);return a}function bj(a,b,c){b=b||0;if(p.isFunction(b))return p.grep(a,function(a,d){var e=!!b.call(a,d,a);return e===c});if(b.nodeType)return p.grep(a,function(a,d){return a===b===c});if(typeof b=="string"){var d=p.grep(a,function(a){return a.nodeType===1});if(be.test(b))return p.filter(b,d,!c);b=p.filter(b,d)}return p.grep(a,function(a,d){return p.inArray(a,b)>=0===c})}function bk(a){var b=bl.split("|"),c=a.createDocumentFragment();if(c.createElement)while(b.length)c.createElement(b.pop());return c}function bC(a,b){return a.getElementsByTagName(b)[0]||a.appendChild(a.ownerDocument.createElement(b))}function bD(a,b){if(b.nodeType!==1||!p.hasData(a))return;var c,d,e,f=p._data(a),g=p._data(b,f),h=f.events;if(h){delete g.handle,g.events={};for(c in h)for(d=0,e=h[c].length;d<e;d++)p.event.add(b,c,h[c][d])}g.data&&(g.data=p.extend({},g.data))}function bE(a,b){var c;if(b.nodeType!==1)return;b.clearAttributes&&b.clearAttributes(),b.mergeAttributes&&b.mergeAttributes(a),c=b.nodeName.toLowerCase(),c==="object"?(b.parentNode&&(b.outerHTML=a.outerHTML),p.support.html5Clone&&a.innerHTML&&!p.trim(b.innerHTML)&&(b.innerHTML=a.innerHTML)):c==="input"&&bv.test(a.type)?(b.defaultChecked=b.checked=a.checked,b.value!==a.value&&(b.value=a.value)):c==="option"?b.selected=a.defaultSelected:c==="input"||c==="textarea"?b.defaultValue=a.defaultValue:c==="script"&&b.text!==a.text&&(b.text=a.text),b.removeAttribute(p.expando)}function bF(a){return typeof a.getElementsByTagName!="undefined"?a.getElementsByTagName("*"):typeof a.querySelectorAll!="undefined"?a.querySelectorAll("*"):[]}function bG(a){bv.test(a.type)&&(a.defaultChecked=a.checked)}function bY(a,b){if(b in a)return b;var c=b.charAt(0).toUpperCase()+b.slice(1),d=b,e=bW.length;while(e--){b=bW[e]+c;if(b in a)return b}return d}function bZ(a,b){return a=b||a,p.css(a,"display")==="none"||!p.contains(a.ownerDocument,a)}function b$(a,b){var c,d,e=[],f=0,g=a.length;for(;f<g;f++){c=a[f];if(!c.style)continue;e[f]=p._data(c,"olddisplay"),b?(!e[f]&&c.style.display==="none"&&(c.style.display=""),c.style.display===""&&bZ(c)&&(e[f]=p._data(c,"olddisplay",cc(c.nodeName)))):(d=bH(c,"display"),!e[f]&&d!=="none"&&p._data(c,"olddisplay",d))}for(f=0;f<g;f++){c=a[f];if(!c.style)continue;if(!b||c.style.display==="none"||c.style.display==="")c.style.display=b?e[f]||"":"none"}return a}function b_(a,b,c){var d=bP.exec(b);return d?Math.max(0,d[1]-(c||0))+(d[2]||"px"):b}function ca(a,b,c,d){var e=c===(d?"border":"content")?4:b==="width"?1:0,f=0;for(;e<4;e+=2)c==="margin"&&(f+=p.css(a,c+bV[e],!0)),d?(c==="content"&&(f-=parseFloat(bH(a,"padding"+bV[e]))||0),c!=="margin"&&(f-=parseFloat(bH(a,"border"+bV[e]+"Width"))||0)):(f+=parseFloat(bH(a,"padding"+bV[e]))||0,c!=="padding"&&(f+=parseFloat(bH(a,"border"+bV[e]+"Width"))||0));return f}function cb(a,b,c){var d=b==="width"?a.offsetWidth:a.offsetHeight,e=!0,f=p.support.boxSizing&&p.css(a,"boxSizing")==="border-box";if(d<=0||d==null){d=bH(a,b);if(d<0||d==null)d=a.style[b];if(bQ.test(d))return d;e=f&&(p.support.boxSizingReliable||d===a.style[b]),d=parseFloat(d)||0}return d+ca(a,b,c||(f?"border":"content"),e)+"px"}function cc(a){if(bS[a])return bS[a];var b=p("<"+a+">").appendTo(e.body),c=b.css("display");b.remove();if(c==="none"||c===""){bI=e.body.appendChild(bI||p.extend(e.createElement("iframe"),{frameBorder:0,width:0,height:0}));if(!bJ||!bI.createElement)bJ=(bI.contentWindow||bI.contentDocument).document,bJ.write("<!doctype html><html><body>"),bJ.close();b=bJ.body.appendChild(bJ.createElement(a)),c=bH(b,"display"),e.body.removeChild(bI)}return bS[a]=c,c}function ci(a,b,c,d){var e;if(p.isArray(b))p.each(b,function(b,e){c||ce.test(a)?d(a,e):ci(a+"["+(typeof e=="object"?b:"")+"]",e,c,d)});else if(!c&&p.type(b)==="object")for(e in b)ci(a+"["+e+"]",b[e],c,d);else d(a,b)}function cz(a){return function(b,c){typeof b!="string"&&(c=b,b="*");var d,e,f,g=b.toLowerCase().split(s),h=0,i=g.length;if(p.isFunction(c))for(;h<i;h++)d=g[h],f=/^\+/.test(d),f&&(d=d.substr(1)||"*"),e=a[d]=a[d]||[],e[f?"unshift":"push"](c)}}function cA(a,c,d,e,f,g){f=f||c.dataTypes[0],g=g||{},g[f]=!0;var h,i=a[f],j=0,k=i?i.length:0,l=a===cv;for(;j<k&&(l||!h);j++)h=i[j](c,d,e),typeof h=="string"&&(!l||g[h]?h=b:(c.dataTypes.unshift(h),h=cA(a,c,d,e,h,g)));return(l||!h)&&!g["*"]&&(h=cA(a,c,d,e,"*",g)),h}function cB(a,c){var d,e,f=p.ajaxSettings.flatOptions||{};for(d in c)c[d]!==b&&((f[d]?a:e||(e={}))[d]=c[d]);e&&p.extend(!0,a,e)}function cC(a,c,d){var e,f,g,h,i=a.contents,j=a.dataTypes,k=a.responseFields;for(f in k)f in d&&(c[k[f]]=d[f]);while(j[0]==="*")j.shift(),e===b&&(e=a.mimeType||c.getResponseHeader("content-type"));if(e)for(f in i)if(i[f]&&i[f].test(e)){j.unshift(f);break}if(j[0]in d)g=j[0];else{for(f in d){if(!j[0]||a.converters[f+" "+j[0]]){g=f;break}h||(h=f)}g=g||h}if(g)return g!==j[0]&&j.unshift(g),d[g]}function cD(a,b){var c,d,e,f,g=a.dataTypes.slice(),h=g[0],i={},j=0;a.dataFilter&&(b=a.dataFilter(b,a.dataType));if(g[1])for(c in a.converters)i[c.toLowerCase()]=a.converters[c];for(;e=g[++j];)if(e!=="*"){if(h!=="*"&&h!==e){c=i[h+" "+e]||i["* "+e];if(!c)for(d in i){f=d.split(" ");if(f[1]===e){c=i[h+" "+f[0]]||i["* "+f[0]];if(c){c===!0?c=i[d]:i[d]!==!0&&(e=f[0],g.splice(j--,0,e));break}}}if(c!==!0)if(c&&a["throws"])b=c(b);else try{b=c(b)}catch(k){return{state:"parsererror",error:c?k:"No conversion from "+h+" to "+e}}}h=e}return{state:"success",data:b}}function cL(){try{return new a.XMLHttpRequest}catch(b){}}function cM(){try{return new a.ActiveXObject("Microsoft.XMLHTTP")}catch(b){}}function cU(){return setTimeout(function(){cN=b},0),cN=p.now()}function cV(a,b){p.each(b,function(b,c){var d=(cT[b]||[]).concat(cT["*"]),e=0,f=d.length;for(;e<f;e++)if(d[e].call(a,b,c))return})}function cW(a,b,c){var d,e=0,f=0,g=cS.length,h=p.Deferred().always(function(){delete i.elem}),i=function(){var b=cN||cU(),c=Math.max(0,j.startTime+j.duration-b),d=1-(c/j.duration||0),e=0,f=j.tweens.length;for(;e<f;e++)j.tweens[e].run(d);return h.notifyWith(a,[j,d,c]),d<1&&f?c:(h.resolveWith(a,[j]),!1)},j=h.promise({elem:a,props:p.extend({},b),opts:p.extend(!0,{specialEasing:{}},c),originalProperties:b,originalOptions:c,startTime:cN||cU(),duration:c.duration,tweens:[],createTween:function(b,c,d){var e=p.Tween(a,j.opts,b,c,j.opts.specialEasing[b]||j.opts.easing);return j.tweens.push(e),e},stop:function(b){var c=0,d=b?j.tweens.length:0;for(;c<d;c++)j.tweens[c].run(1);return b?h.resolveWith(a,[j,b]):h.rejectWith(a,[j,b]),this}}),k=j.props;cX(k,j.opts.specialEasing);for(;e<g;e++){d=cS[e].call(j,a,k,j.opts);if(d)return d}return cV(j,k),p.isFunction(j.opts.start)&&j.opts.start.call(a,j),p.fx.timer(p.extend(i,{anim:j,queue:j.opts.queue,elem:a})),j.progress(j.opts.progress).done(j.opts.done,j.opts.complete).fail(j.opts.fail).always(j.opts.always)}function cX(a,b){var c,d,e,f,g;for(c in a){d=p.camelCase(c),e=b[d],f=a[c],p.isArray(f)&&(e=f[1],f=a[c]=f[0]),c!==d&&(a[d]=f,delete a[c]),g=p.cssHooks[d];if(g&&"expand"in g){f=g.expand(f),delete a[d];for(c in f)c in a||(a[c]=f[c],b[c]=e)}else b[d]=e}}function cY(a,b,c){var d,e,f,g,h,i,j,k,l=this,m=a.style,n={},o=[],q=a.nodeType&&bZ(a);c.queue||(j=p._queueHooks(a,"fx"),j.unqueued==null&&(j.unqueued=0,k=j.empty.fire,j.empty.fire=function(){j.unqueued||k()}),j.unqueued++,l.always(function(){l.always(function(){j.unqueued--,p.queue(a,"fx").length||j.empty.fire()})})),a.nodeType===1&&("height"in b||"width"in b)&&(c.overflow=[m.overflow,m.overflowX,m.overflowY],p.css(a,"display")==="inline"&&p.css(a,"float")==="none"&&(!p.support.inlineBlockNeedsLayout||cc(a.nodeName)==="inline"?m.display="inline-block":m.zoom=1)),c.overflow&&(m.overflow="hidden",p.support.shrinkWrapBlocks||l.done(function(){m.overflow=c.overflow[0],m.overflowX=c.overflow[1],m.overflowY=c.overflow[2]}));for(d in b){f=b[d];if(cP.exec(f)){delete b[d];if(f===(q?"hide":"show"))continue;o.push(d)}}g=o.length;if(g){h=p._data(a,"fxshow")||p._data(a,"fxshow",{}),q?p(a).show():l.done(function(){p(a).hide()}),l.done(function(){var b;p.removeData(a,"fxshow",!0);for(b in n)p.style(a,b,n[b])});for(d=0;d<g;d++)e=o[d],i=l.createTween(e,q?h[e]:0),n[e]=h[e]||p.style(a,e),e in h||(h[e]=i.start,q&&(i.end=i.start,i.start=e==="width"||e==="height"?1:0))}}function cZ(a,b,c,d,e){return new cZ.prototype.init(a,b,c,d,e)}function c$(a,b){var c,d={height:a},e=0;b=b?1:0;for(;e<4;e+=2-b)c=bV[e],d["margin"+c]=d["padding"+c]=a;return b&&(d.opacity=d.width=a),d}function da(a){return p.isWindow(a)?a:a.nodeType===9?a.defaultView||a.parentWindow:!1}var c,d,e=a.document,f=a.location,g=a.navigator,h=a.jQuery,i=a.$,j=Array.prototype.push,k=Array.prototype.slice,l=Array.prototype.indexOf,m=Object.prototype.toString,n=Object.prototype.hasOwnProperty,o=String.prototype.trim,p=function(a,b){return new p.fn.init(a,b,c)},q=/[\-+]?(?:\d*\.|)\d+(?:[eE][\-+]?\d+|)/.source,r=/\S/,s=/\s+/,t=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,u=/^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,v=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,w=/^[\],:{}\s]*$/,x=/(?:^|:|,)(?:\s*\[)+/g,y=/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,z=/"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g,A=/^-ms-/,B=/-([\da-z])/gi,C=function(a,b){return(b+"").toUpperCase()},D=function(){e.addEventListener?(e.removeEventListener("DOMContentLoaded",D,!1),p.ready()):e.readyState==="complete"&&(e.detachEvent("onreadystatechange",D),p.ready())},E={};p.fn=p.prototype={constructor:p,init:function(a,c,d){var f,g,h,i;if(!a)return this;if(a.nodeType)return this.context=this[0]=a,this.length=1,this;if(typeof a=="string"){a.charAt(0)==="<"&&a.charAt(a.length-1)===">"&&a.length>=3?f=[null,a,null]:f=u.exec(a);if(f&&(f[1]||!c)){if(f[1])return c=c instanceof p?c[0]:c,i=c&&c.nodeType?c.ownerDocument||c:e,a=p.parseHTML(f[1],i,!0),v.test(f[1])&&p.isPlainObject(c)&&this.attr.call(a,c,!0),p.merge(this,a);g=e.getElementById(f[2]);if(g&&g.parentNode){if(g.id!==f[2])return d.find(a);this.length=1,this[0]=g}return this.context=e,this.selector=a,this}return!c||c.jquery?(c||d).find(a):this.constructor(c).find(a)}return p.isFunction(a)?d.ready(a):(a.selector!==b&&(this.selector=a.selector,this.context=a.context),p.makeArray(a,this))},selector:"",jquery:"1.8.2",length:0,size:function(){return this.length},toArray:function(){return k.call(this)},get:function(a){return a==null?this.toArray():a<0?this[this.length+a]:this[a]},pushStack:function(a,b,c){var d=p.merge(this.constructor(),a);return d.prevObject=this,d.context=this.context,b==="find"?d.selector=this.selector+(this.selector?" ":"")+c:b&&(d.selector=this.selector+"."+b+"("+c+")"),d},each:function(a,b){return p.each(this,a,b)},ready:function(a){return p.ready.promise().done(a),this},eq:function(a){return a=+a,a===-1?this.slice(a):this.slice(a,a+1)},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},slice:function(){return this.pushStack(k.apply(this,arguments),"slice",k.call(arguments).join(","))},map:function(a){return this.pushStack(p.map(this,function(b,c){return a.call(b,c,b)}))},end:function(){return this.prevObject||this.constructor(null)},push:j,sort:[].sort,splice:[].splice},p.fn.init.prototype=p.fn,p.extend=p.fn.extend=function(){var a,c,d,e,f,g,h=arguments[0]||{},i=1,j=arguments.length,k=!1;typeof h=="boolean"&&(k=h,h=arguments[1]||{},i=2),typeof h!="object"&&!p.isFunction(h)&&(h={}),j===i&&(h=this,--i);for(;i<j;i++)if((a=arguments[i])!=null)for(c in a){d=h[c],e=a[c];if(h===e)continue;k&&e&&(p.isPlainObject(e)||(f=p.isArray(e)))?(f?(f=!1,g=d&&p.isArray(d)?d:[]):g=d&&p.isPlainObject(d)?d:{},h[c]=p.extend(k,g,e)):e!==b&&(h[c]=e)}return h},p.extend({noConflict:function(b){return a.$===p&&(a.$=i),b&&a.jQuery===p&&(a.jQuery=h),p},isReady:!1,readyWait:1,holdReady:function(a){a?p.readyWait++:p.ready(!0)},ready:function(a){if(a===!0?--p.readyWait:p.isReady)return;if(!e.body)return setTimeout(p.ready,1);p.isReady=!0;if(a!==!0&&--p.readyWait>0)return;d.resolveWith(e,[p]),p.fn.trigger&&p(e).trigger("ready").off("ready")},isFunction:function(a){return p.type(a)==="function"},isArray:Array.isArray||function(a){return p.type(a)==="array"},isWindow:function(a){return a!=null&&a==a.window},isNumeric:function(a){return!isNaN(parseFloat(a))&&isFinite(a)},type:function(a){return a==null?String(a):E[m.call(a)]||"object"},isPlainObject:function(a){if(!a||p.type(a)!=="object"||a.nodeType||p.isWindow(a))return!1;try{if(a.constructor&&!n.call(a,"constructor")&&!n.call(a.constructor.prototype,"isPrototypeOf"))return!1}catch(c){return!1}var d;for(d in a);return d===b||n.call(a,d)},isEmptyObject:function(a){var b;for(b in a)return!1;return!0},error:function(a){throw new Error(a)},parseHTML:function(a,b,c){var d;return!a||typeof a!="string"?null:(typeof b=="boolean"&&(c=b,b=0),b=b||e,(d=v.exec(a))?[b.createElement(d[1])]:(d=p.buildFragment([a],b,c?null:[]),p.merge([],(d.cacheable?p.clone(d.fragment):d.fragment).childNodes)))},parseJSON:function(b){if(!b||typeof b!="string")return null;b=p.trim(b);if(a.JSON&&a.JSON.parse)return a.JSON.parse(b);if(w.test(b.replace(y,"@").replace(z,"]").replace(x,"")))return(new Function("return "+b))();p.error("Invalid JSON: "+b)},parseXML:function(c){var d,e;if(!c||typeof c!="string")return null;try{a.DOMParser?(e=new DOMParser,d=e.parseFromString(c,"text/xml")):(d=new ActiveXObject("Microsoft.XMLDOM"),d.async="false",d.loadXML(c))}catch(f){d=b}return(!d||!d.documentElement||d.getElementsByTagName("parsererror").length)&&p.error("Invalid XML: "+c),d},noop:function(){},globalEval:function(b){b&&r.test(b)&&(a.execScript||function(b){a.eval.call(a,b)})(b)},camelCase:function(a){return a.replace(A,"ms-").replace(B,C)},nodeName:function(a,b){return a.nodeName&&a.nodeName.toLowerCase()===b.toLowerCase()},each:function(a,c,d){var e,f=0,g=a.length,h=g===b||p.isFunction(a);if(d){if(h){for(e in a)if(c.apply(a[e],d)===!1)break}else for(;f<g;)if(c.apply(a[f++],d)===!1)break}else if(h){for(e in a)if(c.call(a[e],e,a[e])===!1)break}else for(;f<g;)if(c.call(a[f],f,a[f++])===!1)break;return a},trim:o&&!o.call("﻿ ")?function(a){return a==null?"":o.call(a)}:function(a){return a==null?"":(a+"").replace(t,"")},makeArray:function(a,b){var c,d=b||[];return a!=null&&(c=p.type(a),a.length==null||c==="string"||c==="function"||c==="regexp"||p.isWindow(a)?j.call(d,a):p.merge(d,a)),d},inArray:function(a,b,c){var d;if(b){if(l)return l.call(b,a,c);d=b.length,c=c?c<0?Math.max(0,d+c):c:0;for(;c<d;c++)if(c in b&&b[c]===a)return c}return-1},merge:function(a,c){var d=c.length,e=a.length,f=0;if(typeof d=="number")for(;f<d;f++)a[e++]=c[f];else while(c[f]!==b)a[e++]=c[f++];return a.length=e,a},grep:function(a,b,c){var d,e=[],f=0,g=a.length;c=!!c;for(;f<g;f++)d=!!b(a[f],f),c!==d&&e.push(a[f]);return e},map:function(a,c,d){var e,f,g=[],h=0,i=a.length,j=a instanceof p||i!==b&&typeof i=="number"&&(i>0&&a[0]&&a[i-1]||i===0||p.isArray(a));if(j)for(;h<i;h++)e=c(a[h],h,d),e!=null&&(g[g.length]=e);else for(f in a)e=c(a[f],f,d),e!=null&&(g[g.length]=e);return g.concat.apply([],g)},guid:1,proxy:function(a,c){var d,e,f;return typeof c=="string"&&(d=a[c],c=a,a=d),p.isFunction(a)?(e=k.call(arguments,2),f=function(){return a.apply(c,e.concat(k.call(arguments)))},f.guid=a.guid=a.guid||p.guid++,f):b},access:function(a,c,d,e,f,g,h){var i,j=d==null,k=0,l=a.length;if(d&&typeof d=="object"){for(k in d)p.access(a,c,k,d[k],1,g,e);f=1}else if(e!==b){i=h===b&&p.isFunction(e),j&&(i?(i=c,c=function(a,b,c){return i.call(p(a),c)}):(c.call(a,e),c=null));if(c)for(;k<l;k++)c(a[k],d,i?e.call(a[k],k,c(a[k],d)):e,h);f=1}return f?a:j?c.call(a):l?c(a[0],d):g},now:function(){return(new Date).getTime()}}),p.ready.promise=function(b){if(!d){d=p.Deferred();if(e.readyState==="complete")setTimeout(p.ready,1);else if(e.addEventListener)e.addEventListener("DOMContentLoaded",D,!1),a.addEventListener("load",p.ready,!1);else{e.attachEvent("onreadystatechange",D),a.attachEvent("onload",p.ready);var c=!1;try{c=a.frameElement==null&&e.documentElement}catch(f){}c&&c.doScroll&&function g(){if(!p.isReady){try{c.doScroll("left")}catch(a){return setTimeout(g,50)}p.ready()}}()}}return d.promise(b)},p.each("Boolean Number String Function Array Date RegExp Object".split(" "),function(a,b){E["[object "+b+"]"]=b.toLowerCase()}),c=p(e);var F={};p.Callbacks=function(a){a=typeof a=="string"?F[a]||G(a):p.extend({},a);var c,d,e,f,g,h,i=[],j=!a.once&&[],k=function(b){c=a.memory&&b,d=!0,h=f||0,f=0,g=i.length,e=!0;for(;i&&h<g;h++)if(i[h].apply(b[0],b[1])===!1&&a.stopOnFalse){c=!1;break}e=!1,i&&(j?j.length&&k(j.shift()):c?i=[]:l.disable())},l={add:function(){if(i){var b=i.length;(function d(b){p.each(b,function(b,c){var e=p.type(c);e==="function"&&(!a.unique||!l.has(c))?i.push(c):c&&c.length&&e!=="string"&&d(c)})})(arguments),e?g=i.length:c&&(f=b,k(c))}return this},remove:function(){return i&&p.each(arguments,function(a,b){var c;while((c=p.inArray(b,i,c))>-1)i.splice(c,1),e&&(c<=g&&g--,c<=h&&h--)}),this},has:function(a){return p.inArray(a,i)>-1},empty:function(){return i=[],this},disable:function(){return i=j=c=b,this},disabled:function(){return!i},lock:function(){return j=b,c||l.disable(),this},locked:function(){return!j},fireWith:function(a,b){return b=b||[],b=[a,b.slice?b.slice():b],i&&(!d||j)&&(e?j.push(b):k(b)),this},fire:function(){return l.fireWith(this,arguments),this},fired:function(){return!!d}};return l},p.extend({Deferred:function(a){var b=[["resolve","done",p.Callbacks("once memory"),"resolved"],["reject","fail",p.Callbacks("once memory"),"rejected"],["notify","progress",p.Callbacks("memory")]],c="pending",d={state:function(){return c},always:function(){return e.done(arguments).fail(arguments),this},then:function(){var a=arguments;return p.Deferred(function(c){p.each(b,function(b,d){var f=d[0],g=a[b];e[d[1]](p.isFunction(g)?function(){var a=g.apply(this,arguments);a&&p.isFunction(a.promise)?a.promise().done(c.resolve).fail(c.reject).progress(c.notify):c[f+"With"](this===e?c:this,[a])}:c[f])}),a=null}).promise()},promise:function(a){return a!=null?p.extend(a,d):d}},e={};return d.pipe=d.then,p.each(b,function(a,f){var g=f[2],h=f[3];d[f[1]]=g.add,h&&g.add(function(){c=h},b[a^1][2].disable,b[2][2].lock),e[f[0]]=g.fire,e[f[0]+"With"]=g.fireWith}),d.promise(e),a&&a.call(e,e),e},when:function(a){var b=0,c=k.call(arguments),d=c.length,e=d!==1||a&&p.isFunction(a.promise)?d:0,f=e===1?a:p.Deferred(),g=function(a,b,c){return function(d){b[a]=this,c[a]=arguments.length>1?k.call(arguments):d,c===h?f.notifyWith(b,c):--e||f.resolveWith(b,c)}},h,i,j;if(d>1){h=new Array(d),i=new Array(d),j=new Array(d);for(;b<d;b++)c[b]&&p.isFunction(c[b].promise)?c[b].promise().done(g(b,j,c)).fail(f.reject).progress(g(b,i,h)):--e}return e||f.resolveWith(j,c),f.promise()}}),p.support=function(){var b,c,d,f,g,h,i,j,k,l,m,n=e.createElement("div");n.setAttribute("className","t"),n.innerHTML="  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",c=n.getElementsByTagName("*"),d=n.getElementsByTagName("a")[0],d.style.cssText="top:1px;float:left;opacity:.5";if(!c||!c.length)return{};f=e.createElement("select"),g=f.appendChild(e.createElement("option")),h=n.getElementsByTagName("input")[0],b={leadingWhitespace:n.firstChild.nodeType===3,tbody:!n.getElementsByTagName("tbody").length,htmlSerialize:!!n.getElementsByTagName("link").length,style:/top/.test(d.getAttribute("style")),hrefNormalized:d.getAttribute("href")==="/a",opacity:/^0.5/.test(d.style.opacity),cssFloat:!!d.style.cssFloat,checkOn:h.value==="on",optSelected:g.selected,getSetAttribute:n.className!=="t",enctype:!!e.createElement("form").enctype,html5Clone:e.createElement("nav").cloneNode(!0).outerHTML!=="<:nav></:nav>",boxModel:e.compatMode==="CSS1Compat",submitBubbles:!0,changeBubbles:!0,focusinBubbles:!1,deleteExpando:!0,noCloneEvent:!0,inlineBlockNeedsLayout:!1,shrinkWrapBlocks:!1,reliableMarginRight:!0,boxSizingReliable:!0,pixelPosition:!1},h.checked=!0,b.noCloneChecked=h.cloneNode(!0).checked,f.disabled=!0,b.optDisabled=!g.disabled;try{delete n.test}catch(o){b.deleteExpando=!1}!n.addEventListener&&n.attachEvent&&n.fireEvent&&(n.attachEvent("onclick",m=function(){b.noCloneEvent=!1}),n.cloneNode(!0).fireEvent("onclick"),n.detachEvent("onclick",m)),h=e.createElement("input"),h.value="t",h.setAttribute("type","radio"),b.radioValue=h.value==="t",h.setAttribute("checked","checked"),h.setAttribute("name","t"),n.appendChild(h),i=e.createDocumentFragment(),i.appendChild(n.lastChild),b.checkClone=i.cloneNode(!0).cloneNode(!0).lastChild.checked,b.appendChecked=h.checked,i.removeChild(h),i.appendChild(n);if(n.attachEvent)for(k in{submit:!0,change:!0,focusin:!0})j="on"+k,l=j in n,l||(n.setAttribute(j,"return;"),l=typeof n[j]=="function"),b[k+"Bubbles"]=l;return p(function(){var c,d,f,g,h="padding:0;margin:0;border:0;display:block;overflow:hidden;",i=e.getElementsByTagName("body")[0];if(!i)return;c=e.createElement("div"),c.style.cssText="visibility:hidden;border:0;width:0;height:0;position:static;top:0;margin-top:1px",i.insertBefore(c,i.firstChild),d=e.createElement("div"),c.appendChild(d),d.innerHTML="<table><tr><td></td><td>t</td></tr></table>",f=d.getElementsByTagName("td"),f[0].style.cssText="padding:0;margin:0;border:0;display:none",l=f[0].offsetHeight===0,f[0].style.display="",f[1].style.display="none",b.reliableHiddenOffsets=l&&f[0].offsetHeight===0,d.innerHTML="",d.style.cssText="box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;",b.boxSizing=d.offsetWidth===4,b.doesNotIncludeMarginInBodyOffset=i.offsetTop!==1,a.getComputedStyle&&(b.pixelPosition=(a.getComputedStyle(d,null)||{}).top!=="1%",b.boxSizingReliable=(a.getComputedStyle(d,null)||{width:"4px"}).width==="4px",g=e.createElement("div"),g.style.cssText=d.style.cssText=h,g.style.marginRight=g.style.width="0",d.style.width="1px",d.appendChild(g),b.reliableMarginRight=!parseFloat((a.getComputedStyle(g,null)||{}).marginRight)),typeof d.style.zoom!="undefined"&&(d.innerHTML="",d.style.cssText=h+"width:1px;padding:1px;display:inline;zoom:1",b.inlineBlockNeedsLayout=d.offsetWidth===3,d.style.display="block",d.style.overflow="visible",d.innerHTML="<div></div>",d.firstChild.style.width="5px",b.shrinkWrapBlocks=d.offsetWidth!==3,c.style.zoom=1),i.removeChild(c),c=d=f=g=null}),i.removeChild(n),c=d=f=g=h=i=n=null,b}();var H=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,I=/([A-Z])/g;p.extend({cache:{},deletedIds:[],uuid:0,expando:"jQuery"+(p.fn.jquery+Math.random()).replace(/\D/g,""),noData:{embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",applet:!0},hasData:function(a){return a=a.nodeType?p.cache[a[p.expando]]:a[p.expando],!!a&&!K(a)},data:function(a,c,d,e){if(!p.acceptData(a))return;var f,g,h=p.expando,i=typeof c=="string",j=a.nodeType,k=j?p.cache:a,l=j?a[h]:a[h]&&h;if((!l||!k[l]||!e&&!k[l].data)&&i&&d===b)return;l||(j?a[h]=l=p.deletedIds.pop()||p.guid++:l=h),k[l]||(k[l]={},j||(k[l].toJSON=p.noop));if(typeof c=="object"||typeof c=="function")e?k[l]=p.extend(k[l],c):k[l].data=p.extend(k[l].data,c);return f=k[l],e||(f.data||(f.data={}),f=f.data),d!==b&&(f[p.camelCase(c)]=d),i?(g=f[c],g==null&&(g=f[p.camelCase(c)])):g=f,g},removeData:function(a,b,c){if(!p.acceptData(a))return;var d,e,f,g=a.nodeType,h=g?p.cache:a,i=g?a[p.expando]:p.expando;if(!h[i])return;if(b){d=c?h[i]:h[i].data;if(d){p.isArray(b)||(b in d?b=[b]:(b=p.camelCase(b),b in d?b=[b]:b=b.split(" ")));for(e=0,f=b.length;e<f;e++)delete d[b[e]];if(!(c?K:p.isEmptyObject)(d))return}}if(!c){delete h[i].data;if(!K(h[i]))return}g?p.cleanData([a],!0):p.support.deleteExpando||h!=h.window?delete h[i]:h[i]=null},_data:function(a,b,c){return p.data(a,b,c,!0)},acceptData:function(a){var b=a.nodeName&&p.noData[a.nodeName.toLowerCase()];return!b||b!==!0&&a.getAttribute("classid")===b}}),p.fn.extend({data:function(a,c){var d,e,f,g,h,i=this[0],j=0,k=null;if(a===b){if(this.length){k=p.data(i);if(i.nodeType===1&&!p._data(i,"parsedAttrs")){f=i.attributes;for(h=f.length;j<h;j++)g=f[j].name,g.indexOf("data-")||(g=p.camelCase(g.substring(5)),J(i,g,k[g]));p._data(i,"parsedAttrs",!0)}}return k}return typeof a=="object"?this.each(function(){p.data(this,a)}):(d=a.split(".",2),d[1]=d[1]?"."+d[1]:"",e=d[1]+"!",p.access(this,function(c){if(c===b)return k=this.triggerHandler("getData"+e,[d[0]]),k===b&&i&&(k=p.data(i,a),k=J(i,a,k)),k===b&&d[1]?this.data(d[0]):k;d[1]=c,this.each(function(){var b=p(this);b.triggerHandler("setData"+e,d),p.data(this,a,c),b.triggerHandler("changeData"+e,d)})},null,c,arguments.length>1,null,!1))},removeData:function(a){return this.each(function(){p.removeData(this,a)})}}),p.extend({queue:function(a,b,c){var d;if(a)return b=(b||"fx")+"queue",d=p._data(a,b),c&&(!d||p.isArray(c)?d=p._data(a,b,p.makeArray(c)):d.push(c)),d||[]},dequeue:function(a,b){b=b||"fx";var c=p.queue(a,b),d=c.length,e=c.shift(),f=p._queueHooks(a,b),g=function(){p.dequeue(a,b)};e==="inprogress"&&(e=c.shift(),d--),e&&(b==="fx"&&c.unshift("inprogress"),delete f.stop,e.call(a,g,f)),!d&&f&&f.empty.fire()},_queueHooks:function(a,b){var c=b+"queueHooks";return p._data(a,c)||p._data(a,c,{empty:p.Callbacks("once memory").add(function(){p.removeData(a,b+"queue",!0),p.removeData(a,c,!0)})})}}),p.fn.extend({queue:function(a,c){var d=2;return typeof a!="string"&&(c=a,a="fx",d--),arguments.length<d?p.queue(this[0],a):c===b?this:this.each(function(){var b=p.queue(this,a,c);p._queueHooks(this,a),a==="fx"&&b[0]!=="inprogress"&&p.dequeue(this,a)})},dequeue:function(a){return this.each(function(){p.dequeue(this,a)})},delay:function(a,b){return a=p.fx?p.fx.speeds[a]||a:a,b=b||"fx",this.queue(b,function(b,c){var d=setTimeout(b,a);c.stop=function(){clearTimeout(d)}})},clearQueue:function(a){return this.queue(a||"fx",[])},promise:function(a,c){var d,e=1,f=p.Deferred(),g=this,h=this.length,i=function(){--e||f.resolveWith(g,[g])};typeof a!="string"&&(c=a,a=b),a=a||"fx";while(h--)d=p._data(g[h],a+"queueHooks"),d&&d.empty&&(e++,d.empty.add(i));return i(),f.promise(c)}});var L,M,N,O=/[\t\r\n]/g,P=/\r/g,Q=/^(?:button|input)$/i,R=/^(?:button|input|object|select|textarea)$/i,S=/^a(?:rea|)$/i,T=/^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,U=p.support.getSetAttribute;p.fn.extend({attr:function(a,b){return p.access(this,p.attr,a,b,arguments.length>1)},removeAttr:function(a){return this.each(function(){p.removeAttr(this,a)})},prop:function(a,b){return p.access(this,p.prop,a,b,arguments.length>1)},removeProp:function(a){return a=p.propFix[a]||a,this.each(function(){try{this[a]=b,delete this[a]}catch(c){}})},addClass:function(a){var b,c,d,e,f,g,h;if(p.isFunction(a))return this.each(function(b){p(this).addClass(a.call(this,b,this.className))});if(a&&typeof a=="string"){b=a.split(s);for(c=0,d=this.length;c<d;c++){e=this[c];if(e.nodeType===1)if(!e.className&&b.length===1)e.className=a;else{f=" "+e.className+" ";for(g=0,h=b.length;g<h;g++)f.indexOf(" "+b[g]+" ")<0&&(f+=b[g]+" ");e.className=p.trim(f)}}}return this},removeClass:function(a){var c,d,e,f,g,h,i;if(p.isFunction(a))return this.each(function(b){p(this).removeClass(a.call(this,b,this.className))});if(a&&typeof a=="string"||a===b){c=(a||"").split(s);for(h=0,i=this.length;h<i;h++){e=this[h];if(e.nodeType===1&&e.className){d=(" "+e.className+" ").replace(O," ");for(f=0,g=c.length;f<g;f++)while(d.indexOf(" "+c[f]+" ")>=0)d=d.replace(" "+c[f]+" "," ");e.className=a?p.trim(d):""}}}return this},toggleClass:function(a,b){var c=typeof a,d=typeof b=="boolean";return p.isFunction(a)?this.each(function(c){p(this).toggleClass(a.call(this,c,this.className,b),b)}):this.each(function(){if(c==="string"){var e,f=0,g=p(this),h=b,i=a.split(s);while(e=i[f++])h=d?h:!g.hasClass(e),g[h?"addClass":"removeClass"](e)}else if(c==="undefined"||c==="boolean")this.className&&p._data(this,"__className__",this.className),this.className=this.className||a===!1?"":p._data(this,"__className__")||""})},hasClass:function(a){var b=" "+a+" ",c=0,d=this.length;for(;c<d;c++)if(this[c].nodeType===1&&(" "+this[c].className+" ").replace(O," ").indexOf(b)>=0)return!0;return!1},val:function(a){var c,d,e,f=this[0];if(!arguments.length){if(f)return c=p.valHooks[f.type]||p.valHooks[f.nodeName.toLowerCase()],c&&"get"in c&&(d=c.get(f,"value"))!==b?d:(d=f.value,typeof d=="string"?d.replace(P,""):d==null?"":d);return}return e=p.isFunction(a),this.each(function(d){var f,g=p(this);if(this.nodeType!==1)return;e?f=a.call(this,d,g.val()):f=a,f==null?f="":typeof f=="number"?f+="":p.isArray(f)&&(f=p.map(f,function(a){return a==null?"":a+""})),c=p.valHooks[this.type]||p.valHooks[this.nodeName.toLowerCase()];if(!c||!("set"in c)||c.set(this,f,"value")===b)this.value=f})}}),p.extend({valHooks:{option:{get:function(a){var b=a.attributes.value;return!b||b.specified?a.value:a.text}},select:{get:function(a){var b,c,d,e,f=a.selectedIndex,g=[],h=a.options,i=a.type==="select-one";if(f<0)return null;c=i?f:0,d=i?f+1:h.length;for(;c<d;c++){e=h[c];if(e.selected&&(p.support.optDisabled?!e.disabled:e.getAttribute("disabled")===null)&&(!e.parentNode.disabled||!p.nodeName(e.parentNode,"optgroup"))){b=p(e).val();if(i)return b;g.push(b)}}return i&&!g.length&&h.length?p(h[f]).val():g},set:function(a,b){var c=p.makeArray(b);return p(a).find("option").each(function(){this.selected=p.inArray(p(this).val(),c)>=0}),c.length||(a.selectedIndex=-1),c}}},attrFn:{},attr:function(a,c,d,e){var f,g,h,i=a.nodeType;if(!a||i===3||i===8||i===2)return;if(e&&p.isFunction(p.fn[c]))return p(a)[c](d);if(typeof a.getAttribute=="undefined")return p.prop(a,c,d);h=i!==1||!p.isXMLDoc(a),h&&(c=c.toLowerCase(),g=p.attrHooks[c]||(T.test(c)?M:L));if(d!==b){if(d===null){p.removeAttr(a,c);return}return g&&"set"in g&&h&&(f=g.set(a,d,c))!==b?f:(a.setAttribute(c,d+""),d)}return g&&"get"in g&&h&&(f=g.get(a,c))!==null?f:(f=a.getAttribute(c),f===null?b:f)},removeAttr:function(a,b){var c,d,e,f,g=0;if(b&&a.nodeType===1){d=b.split(s);for(;g<d.length;g++)e=d[g],e&&(c=p.propFix[e]||e,f=T.test(e),f||p.attr(a,e,""),a.removeAttribute(U?e:c),f&&c in a&&(a[c]=!1))}},attrHooks:{type:{set:function(a,b){if(Q.test(a.nodeName)&&a.parentNode)p.error("type property can't be changed");else if(!p.support.radioValue&&b==="radio"&&p.nodeName(a,"input")){var c=a.value;return a.setAttribute("type",b),c&&(a.value=c),b}}},value:{get:function(a,b){return L&&p.nodeName(a,"button")?L.get(a,b):b in a?a.value:null},set:function(a,b,c){if(L&&p.nodeName(a,"button"))return L.set(a,b,c);a.value=b}}},propFix:{tabindex:"tabIndex",readonly:"readOnly","for":"htmlFor","class":"className",maxlength:"maxLength",cellspacing:"cellSpacing",cellpadding:"cellPadding",rowspan:"rowSpan",colspan:"colSpan",usemap:"useMap",frameborder:"frameBorder",contenteditable:"contentEditable"},prop:function(a,c,d){var e,f,g,h=a.nodeType;if(!a||h===3||h===8||h===2)return;return g=h!==1||!p.isXMLDoc(a),g&&(c=p.propFix[c]||c,f=p.propHooks[c]),d!==b?f&&"set"in f&&(e=f.set(a,d,c))!==b?e:a[c]=d:f&&"get"in f&&(e=f.get(a,c))!==null?e:a[c]},propHooks:{tabIndex:{get:function(a){var c=a.getAttributeNode("tabindex");return c&&c.specified?parseInt(c.value,10):R.test(a.nodeName)||S.test(a.nodeName)&&a.href?0:b}}}}),M={get:function(a,c){var d,e=p.prop(a,c);return e===!0||typeof e!="boolean"&&(d=a.getAttributeNode(c))&&d.nodeValue!==!1?c.toLowerCase():b},set:function(a,b,c){var d;return b===!1?p.removeAttr(a,c):(d=p.propFix[c]||c,d in a&&(a[d]=!0),a.setAttribute(c,c.toLowerCase())),c}},U||(N={name:!0,id:!0,coords:!0},L=p.valHooks.button={get:function(a,c){var d;return d=a.getAttributeNode(c),d&&(N[c]?d.value!=="":d.specified)?d.value:b},set:function(a,b,c){var d=a.getAttributeNode(c);return d||(d=e.createAttribute(c),a.setAttributeNode(d)),d.value=b+""}},p.each(["width","height"],function(a,b){p.attrHooks[b]=p.extend(p.attrHooks[b],{set:function(a,c){if(c==="")return a.setAttribute(b,"auto"),c}})}),p.attrHooks.contenteditable={get:L.get,set:function(a,b,c){b===""&&(b="false"),L.set(a,b,c)}}),p.support.hrefNormalized||p.each(["href","src","width","height"],function(a,c){p.attrHooks[c]=p.extend(p.attrHooks[c],{get:function(a){var d=a.getAttribute(c,2);return d===null?b:d}})}),p.support.style||(p.attrHooks.style={get:function(a){return a.style.cssText.toLowerCase()||b},set:function(a,b){return a.style.cssText=b+""}}),p.support.optSelected||(p.propHooks.selected=p.extend(p.propHooks.selected,{get:function(a){var b=a.parentNode;return b&&(b.selectedIndex,b.parentNode&&b.parentNode.selectedIndex),null}})),p.support.enctype||(p.propFix.enctype="encoding"),p.support.checkOn||p.each(["radio","checkbox"],function(){p.valHooks[this]={get:function(a){return a.getAttribute("value")===null?"on":a.value}}}),p.each(["radio","checkbox"],function(){p.valHooks[this]=p.extend(p.valHooks[this],{set:function(a,b){if(p.isArray(b))return a.checked=p.inArray(p(a).val(),b)>=0}})});var V=/^(?:textarea|input|select)$/i,W=/^([^\.]*|)(?:\.(.+)|)$/,X=/(?:^|\s)hover(\.\S+|)\b/,Y=/^key/,Z=/^(?:mouse|contextmenu)|click/,$=/^(?:focusinfocus|focusoutblur)$/,_=function(a){return p.event.special.hover?a:a.replace(X,"mouseenter$1 mouseleave$1")};p.event={add:function(a,c,d,e,f){var g,h,i,j,k,l,m,n,o,q,r;if(a.nodeType===3||a.nodeType===8||!c||!d||!(g=p._data(a)))return;d.handler&&(o=d,d=o.handler,f=o.selector),d.guid||(d.guid=p.guid++),i=g.events,i||(g.events=i={}),h=g.handle,h||(g.handle=h=function(a){return typeof p!="undefined"&&(!a||p.event.triggered!==a.type)?p.event.dispatch.apply(h.elem,arguments):b},h.elem=a),c=p.trim(_(c)).split(" ");for(j=0;j<c.length;j++){k=W.exec(c[j])||[],l=k[1],m=(k[2]||"").split(".").sort(),r=p.event.special[l]||{},l=(f?r.delegateType:r.bindType)||l,r=p.event.special[l]||{},n=p.extend({type:l,origType:k[1],data:e,handler:d,guid:d.guid,selector:f,needsContext:f&&p.expr.match.needsContext.test(f),namespace:m.join(".")},o),q=i[l];if(!q){q=i[l]=[],q.delegateCount=0;if(!r.setup||r.setup.call(a,e,m,h)===!1)a.addEventListener?a.addEventListener(l,h,!1):a.attachEvent&&a.attachEvent("on"+l,h)}r.add&&(r.add.call(a,n),n.handler.guid||(n.handler.guid=d.guid)),f?q.splice(q.delegateCount++,0,n):q.push(n),p.event.global[l]=!0}a=null},global:{},remove:function(a,b,c,d,e){var f,g,h,i,j,k,l,m,n,o,q,r=p.hasData(a)&&p._data(a);if(!r||!(m=r.events))return;b=p.trim(_(b||"")).split(" ");for(f=0;f<b.length;f++){g=W.exec(b[f])||[],h=i=g[1],j=g[2];if(!h){for(h in m)p.event.remove(a,h+b[f],c,d,!0);continue}n=p.event.special[h]||{},h=(d?n.delegateType:n.bindType)||h,o=m[h]||[],k=o.length,j=j?new RegExp("(^|\\.)"+j.split(".").sort().join("\\.(?:.*\\.|)")+"(\\.|$)"):null;for(l=0;l<o.length;l++)q=o[l],(e||i===q.origType)&&(!c||c.guid===q.guid)&&(!j||j.test(q.namespace))&&(!d||d===q.selector||d==="**"&&q.selector)&&(o.splice(l--,1),q.selector&&o.delegateCount--,n.remove&&n.remove.call(a,q));o.length===0&&k!==o.length&&((!n.teardown||n.teardown.call(a,j,r.handle)===!1)&&p.removeEvent(a,h,r.handle),delete m[h])}p.isEmptyObject(m)&&(delete r.handle,p.removeData(a,"events",!0))},customEvent:{getData:!0,setData:!0,changeData:!0},trigger:function(c,d,f,g){if(!f||f.nodeType!==3&&f.nodeType!==8){var h,i,j,k,l,m,n,o,q,r,s=c.type||c,t=[];if($.test(s+p.event.triggered))return;s.indexOf("!")>=0&&(s=s.slice(0,-1),i=!0),s.indexOf(".")>=0&&(t=s.split("."),s=t.shift(),t.sort());if((!f||p.event.customEvent[s])&&!p.event.global[s])return;c=typeof c=="object"?c[p.expando]?c:new p.Event(s,c):new p.Event(s),c.type=s,c.isTrigger=!0,c.exclusive=i,c.namespace=t.join("."),c.namespace_re=c.namespace?new RegExp("(^|\\.)"+t.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,m=s.indexOf(":")<0?"on"+s:"";if(!f){h=p.cache;for(j in h)h[j].events&&h[j].events[s]&&p.event.trigger(c,d,h[j].handle.elem,!0);return}c.result=b,c.target||(c.target=f),d=d!=null?p.makeArray(d):[],d.unshift(c),n=p.event.special[s]||{};if(n.trigger&&n.trigger.apply(f,d)===!1)return;q=[[f,n.bindType||s]];if(!g&&!n.noBubble&&!p.isWindow(f)){r=n.delegateType||s,k=$.test(r+s)?f:f.parentNode;for(l=f;k;k=k.parentNode)q.push([k,r]),l=k;l===(f.ownerDocument||e)&&q.push([l.defaultView||l.parentWindow||a,r])}for(j=0;j<q.length&&!c.isPropagationStopped();j++)k=q[j][0],c.type=q[j][1],o=(p._data(k,"events")||{})[c.type]&&p._data(k,"handle"),o&&o.apply(k,d),o=m&&k[m],o&&p.acceptData(k)&&o.apply&&o.apply(k,d)===!1&&c.preventDefault();return c.type=s,!g&&!c.isDefaultPrevented()&&(!n._default||n._default.apply(f.ownerDocument,d)===!1)&&(s!=="click"||!p.nodeName(f,"a"))&&p.acceptData(f)&&m&&f[s]&&(s!=="focus"&&s!=="blur"||c.target.offsetWidth!==0)&&!p.isWindow(f)&&(l=f[m],l&&(f[m]=null),p.event.triggered=s,f[s](),p.event.triggered=b,l&&(f[m]=l)),c.result}return},dispatch:function(c){c=p.event.fix(c||a.event);var d,e,f,g,h,i,j,l,m,n,o=(p._data(this,"events")||{})[c.type]||[],q=o.delegateCount,r=k.call(arguments),s=!c.exclusive&&!c.namespace,t=p.event.special[c.type]||{},u=[];r[0]=c,c.delegateTarget=this;if(t.preDispatch&&t.preDispatch.call(this,c)===!1)return;if(q&&(!c.button||c.type!=="click"))for(f=c.target;f!=this;f=f.parentNode||this)if(f.disabled!==!0||c.type!=="click"){h={},j=[];for(d=0;d<q;d++)l=o[d],m=l.selector,h[m]===b&&(h[m]=l.needsContext?p(m,this).index(f)>=0:p.find(m,this,null,[f]).length),h[m]&&j.push(l);j.length&&u.push({elem:f,matches:j})}o.length>q&&u.push({elem:this,matches:o.slice(q)});for(d=0;d<u.length&&!c.isPropagationStopped();d++){i=u[d],c.currentTarget=i.elem;for(e=0;e<i.matches.length&&!c.isImmediatePropagationStopped();e++){l=i.matches[e];if(s||!c.namespace&&!l.namespace||c.namespace_re&&c.namespace_re.test(l.namespace))c.data=l.data,c.handleObj=l,g=((p.event.special[l.origType]||{}).handle||l.handler).apply(i.elem,r),g!==b&&(c.result=g,g===!1&&(c.preventDefault(),c.stopPropagation()))}}return t.postDispatch&&t.postDispatch.call(this,c),c.result},props:"attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(a,b){return a.which==null&&(a.which=b.charCode!=null?b.charCode:b.keyCode),a}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(a,c){var d,f,g,h=c.button,i=c.fromElement;return a.pageX==null&&c.clientX!=null&&(d=a.target.ownerDocument||e,f=d.documentElement,g=d.body,a.pageX=c.clientX+(f&&f.scrollLeft||g&&g.scrollLeft||0)-(f&&f.clientLeft||g&&g.clientLeft||0),a.pageY=c.clientY+(f&&f.scrollTop||g&&g.scrollTop||0)-(f&&f.clientTop||g&&g.clientTop||0)),!a.relatedTarget&&i&&(a.relatedTarget=i===a.target?c.toElement:i),!a.which&&h!==b&&(a.which=h&1?1:h&2?3:h&4?2:0),a}},fix:function(a){if(a[p.expando])return a;var b,c,d=a,f=p.event.fixHooks[a.type]||{},g=f.props?this.props.concat(f.props):this.props;a=p.Event(d);for(b=g.length;b;)c=g[--b],a[c]=d[c];return a.target||(a.target=d.srcElement||e),a.target.nodeType===3&&(a.target=a.target.parentNode),a.metaKey=!!a.metaKey,f.filter?f.filter(a,d):a},special:{load:{noBubble:!0},focus:{delegateType:"focusin"},blur:{delegateType:"focusout"},beforeunload:{setup:function(a,b,c){p.isWindow(this)&&(this.onbeforeunload=c)},teardown:function(a,b){this.onbeforeunload===b&&(this.onbeforeunload=null)}}},simulate:function(a,b,c,d){var e=p.extend(new p.Event,c,{type:a,isSimulated:!0,originalEvent:{}});d?p.event.trigger(e,null,b):p.event.dispatch.call(b,e),e.isDefaultPrevented()&&c.preventDefault()}},p.event.handle=p.event.dispatch,p.removeEvent=e.removeEventListener?function(a,b,c){a.removeEventListener&&a.removeEventListener(b,c,!1)}:function(a,b,c){var d="on"+b;a.detachEvent&&(typeof a[d]=="undefined"&&(a[d]=null),a.detachEvent(d,c))},p.Event=function(a,b){if(this instanceof p.Event)a&&a.type?(this.originalEvent=a,this.type=a.type,this.isDefaultPrevented=a.defaultPrevented||a.returnValue===!1||a.getPreventDefault&&a.getPreventDefault()?bb:ba):this.type=a,b&&p.extend(this,b),this.timeStamp=a&&a.timeStamp||p.now(),this[p.expando]=!0;else return new p.Event(a,b)},p.Event.prototype={preventDefault:function(){this.isDefaultPrevented=bb;var a=this.originalEvent;if(!a)return;a.preventDefault?a.preventDefault():a.returnValue=!1},stopPropagation:function(){this.isPropagationStopped=bb;var a=this.originalEvent;if(!a)return;a.stopPropagation&&a.stopPropagation(),a.cancelBubble=!0},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=bb,this.stopPropagation()},isDefaultPrevented:ba,isPropagationStopped:ba,isImmediatePropagationStopped:ba},p.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(a,b){p.event.special[a]={delegateType:b,bindType:b,handle:function(a){var c,d=this,e=a.relatedTarget,f=a.handleObj,g=f.selector;if(!e||e!==d&&!p.contains(d,e))a.type=f.origType,c=f.handler.apply(this,arguments),a.type=b;return c}}}),p.support.submitBubbles||(p.event.special.submit={setup:function(){if(p.nodeName(this,"form"))return!1;p.event.add(this,"click._submit keypress._submit",function(a){var c=a.target,d=p.nodeName(c,"input")||p.nodeName(c,"button")?c.form:b;d&&!p._data(d,"_submit_attached")&&(p.event.add(d,"submit._submit",function(a){a._submit_bubble=!0}),p._data(d,"_submit_attached",!0))})},postDispatch:function(a){a._submit_bubble&&(delete a._submit_bubble,this.parentNode&&!a.isTrigger&&p.event.simulate("submit",this.parentNode,a,!0))},teardown:function(){if(p.nodeName(this,"form"))return!1;p.event.remove(this,"._submit")}}),p.support.changeBubbles||(p.event.special.change={setup:function(){if(V.test(this.nodeName)){if(this.type==="checkbox"||this.type==="radio")p.event.add(this,"propertychange._change",function(a){a.originalEvent.propertyName==="checked"&&(this._just_changed=!0)}),p.event.add(this,"click._change",function(a){this._just_changed&&!a.isTrigger&&(this._just_changed=!1),p.event.simulate("change",this,a,!0)});return!1}p.event.add(this,"beforeactivate._change",function(a){var b=a.target;V.test(b.nodeName)&&!p._data(b,"_change_attached")&&(p.event.add(b,"change._change",function(a){this.parentNode&&!a.isSimulated&&!a.isTrigger&&p.event.simulate("change",this.parentNode,a,!0)}),p._data(b,"_change_attached",!0))})},handle:function(a){var b=a.target;if(this!==b||a.isSimulated||a.isTrigger||b.type!=="radio"&&b.type!=="checkbox")return a.handleObj.handler.apply(this,arguments)},teardown:function(){return p.event.remove(this,"._change"),!V.test(this.nodeName)}}),p.support.focusinBubbles||p.each({focus:"focusin",blur:"focusout"},function(a,b){var c=0,d=function(a){p.event.simulate(b,a.target,p.event.fix(a),!0)};p.event.special[b]={setup:function(){c++===0&&e.addEventListener(a,d,!0)},teardown:function(){--c===0&&e.removeEventListener(a,d,!0)}}}),p.fn.extend({on:function(a,c,d,e,f){var g,h;if(typeof a=="object"){typeof c!="string"&&(d=d||c,c=b);for(h in a)this.on(h,c,d,a[h],f);return this}d==null&&e==null?(e=c,d=c=b):e==null&&(typeof c=="string"?(e=d,d=b):(e=d,d=c,c=b));if(e===!1)e=ba;else if(!e)return this;return f===1&&(g=e,e=function(a){return p().off(a),g.apply(this,arguments)},e.guid=g.guid||(g.guid=p.guid++)),this.each(function(){p.event.add(this,a,e,d,c)})},one:function(a,b,c,d){return this.on(a,b,c,d,1)},off:function(a,c,d){var e,f;if(a&&a.preventDefault&&a.handleObj)return e=a.handleObj,p(a.delegateTarget).off(e.namespace?e.origType+"."+e.namespace:e.origType,e.selector,e.handler),this;if(typeof a=="object"){for(f in a)this.off(f,c,a[f]);return this}if(c===!1||typeof c=="function")d=c,c=b;return d===!1&&(d=ba),this.each(function(){p.event.remove(this,a,d,c)})},bind:function(a,b,c){return this.on(a,null,b,c)},unbind:function(a,b){return this.off(a,null,b)},live:function(a,b,c){return p(this.context).on(a,this.selector,b,c),this},die:function(a,b){return p(this.context).off(a,this.selector||"**",b),this},delegate:function(a,b,c,d){return this.on(b,a,c,d)},undelegate:function(a,b,c){return arguments.length===1?this.off(a,"**"):this.off(b,a||"**",c)},trigger:function(a,b){return this.each(function(){p.event.trigger(a,b,this)})},triggerHandler:function(a,b){if(this[0])return p.event.trigger(a,b,this[0],!0)},toggle:function(a){var b=arguments,c=a.guid||p.guid++,d=0,e=function(c){var e=(p._data(this,"lastToggle"+a.guid)||0)%d;return p._data(this,"lastToggle"+a.guid,e+1),c.preventDefault(),b[e].apply(this,arguments)||!1};e.guid=c;while(d<b.length)b[d++].guid=c;return this.click(e)},hover:function(a,b){return this.mouseenter(a).mouseleave(b||a)}}),p.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(a,b){p.fn[b]=function(a,c){return c==null&&(c=a,a=null),arguments.length>0?this.on(b,null,a,c):this.trigger(b)},Y.test(b)&&(p.event.fixHooks[b]=p.event.keyHooks),Z.test(b)&&(p.event.fixHooks[b]=p.event.mouseHooks)}),function(a,b){function bc(a,b,c,d){c=c||[],b=b||r;var e,f,i,j,k=b.nodeType;if(!a||typeof a!="string")return c;if(k!==1&&k!==9)return[];i=g(b);if(!i&&!d)if(e=P.exec(a))if(j=e[1]){if(k===9){f=b.getElementById(j);if(!f||!f.parentNode)return c;if(f.id===j)return c.push(f),c}else if(b.ownerDocument&&(f=b.ownerDocument.getElementById(j))&&h(b,f)&&f.id===j)return c.push(f),c}else{if(e[2])return w.apply(c,x.call(b.getElementsByTagName(a),0)),c;if((j=e[3])&&_&&b.getElementsByClassName)return w.apply(c,x.call(b.getElementsByClassName(j),0)),c}return bp(a.replace(L,"$1"),b,c,d,i)}function bd(a){return function(b){var c=b.nodeName.toLowerCase();return c==="input"&&b.type===a}}function be(a){return function(b){var c=b.nodeName.toLowerCase();return(c==="input"||c==="button")&&b.type===a}}function bf(a){return z(function(b){return b=+b,z(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function bg(a,b,c){if(a===b)return c;var d=a.nextSibling;while(d){if(d===b)return-1;d=d.nextSibling}return 1}function bh(a,b){var c,d,f,g,h,i,j,k=C[o][a];if(k)return b?0:k.slice(0);h=a,i=[],j=e.preFilter;while(h){if(!c||(d=M.exec(h)))d&&(h=h.slice(d[0].length)),i.push(f=[]);c=!1;if(d=N.exec(h))f.push(c=new q(d.shift())),h=h.slice(c.length),c.type=d[0].replace(L," ");for(g in e.filter)(d=W[g].exec(h))&&(!j[g]||(d=j[g](d,r,!0)))&&(f.push(c=new q(d.shift())),h=h.slice(c.length),c.type=g,c.matches=d);if(!c)break}return b?h.length:h?bc.error(a):C(a,i).slice(0)}function bi(a,b,d){var e=b.dir,f=d&&b.dir==="parentNode",g=u++;return b.first?function(b,c,d){while(b=b[e])if(f||b.nodeType===1)return a(b,c,d)}:function(b,d,h){if(!h){var i,j=t+" "+g+" ",k=j+c;while(b=b[e])if(f||b.nodeType===1){if((i=b[o])===k)return b.sizset;if(typeof i=="string"&&i.indexOf(j)===0){if(b.sizset)return b}else{b[o]=k;if(a(b,d,h))return b.sizset=!0,b;b.sizset=!1}}}else while(b=b[e])if(f||b.nodeType===1)if(a(b,d,h))return b}}function bj(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function bk(a,b,c,d,e){var f,g=[],h=0,i=a.length,j=b!=null;for(;h<i;h++)if(f=a[h])if(!c||c(f,d,e))g.push(f),j&&b.push(h);return g}function bl(a,b,c,d,e,f){return d&&!d[o]&&(d=bl(d)),e&&!e[o]&&(e=bl(e,f)),z(function(f,g,h,i){if(f&&e)return;var j,k,l,m=[],n=[],o=g.length,p=f||bo(b||"*",h.nodeType?[h]:h,[],f),q=a&&(f||!b)?bk(p,m,a,h,i):p,r=c?e||(f?a:o||d)?[]:g:q;c&&c(q,r,h,i);if(d){l=bk(r,n),d(l,[],h,i),j=l.length;while(j--)if(k=l[j])r[n[j]]=!(q[n[j]]=k)}if(f){j=a&&r.length;while(j--)if(k=r[j])f[m[j]]=!(g[m[j]]=k)}else r=bk(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):w.apply(g,r)})}function bm(a){var b,c,d,f=a.length,g=e.relative[a[0].type],h=g||e.relative[" "],i=g?1:0,j=bi(function(a){return a===b},h,!0),k=bi(function(a){return y.call(b,a)>-1},h,!0),m=[function(a,c,d){return!g&&(d||c!==l)||((b=c).nodeType?j(a,c,d):k(a,c,d))}];for(;i<f;i++)if(c=e.relative[a[i].type])m=[bi(bj(m),c)];else{c=e.filter[a[i].type].apply(null,a[i].matches);if(c[o]){d=++i;for(;d<f;d++)if(e.relative[a[d].type])break;return bl(i>1&&bj(m),i>1&&a.slice(0,i-1).join("").replace(L,"$1"),c,i<d&&bm(a.slice(i,d)),d<f&&bm(a=a.slice(d)),d<f&&a.join(""))}m.push(c)}return bj(m)}function bn(a,b){var d=b.length>0,f=a.length>0,g=function(h,i,j,k,m){var n,o,p,q=[],s=0,u="0",x=h&&[],y=m!=null,z=l,A=h||f&&e.find.TAG("*",m&&i.parentNode||i),B=t+=z==null?1:Math.E;y&&(l=i!==r&&i,c=g.el);for(;(n=A[u])!=null;u++){if(f&&n){for(o=0;p=a[o];o++)if(p(n,i,j)){k.push(n);break}y&&(t=B,c=++g.el)}d&&((n=!p&&n)&&s--,h&&x.push(n))}s+=u;if(d&&u!==s){for(o=0;p=b[o];o++)p(x,q,i,j);if(h){if(s>0)while(u--)!x[u]&&!q[u]&&(q[u]=v.call(k));q=bk(q)}w.apply(k,q),y&&!h&&q.length>0&&s+b.length>1&&bc.uniqueSort(k)}return y&&(t=B,l=z),x};return g.el=0,d?z(g):g}function bo(a,b,c,d){var e=0,f=b.length;for(;e<f;e++)bc(a,b[e],c,d);return c}function bp(a,b,c,d,f){var g,h,j,k,l,m=bh(a),n=m.length;if(!d&&m.length===1){h=m[0]=m[0].slice(0);if(h.length>2&&(j=h[0]).type==="ID"&&b.nodeType===9&&!f&&e.relative[h[1].type]){b=e.find.ID(j.matches[0].replace(V,""),b,f)[0];if(!b)return c;a=a.slice(h.shift().length)}for(g=W.POS.test(a)?-1:h.length-1;g>=0;g--){j=h[g];if(e.relative[k=j.type])break;if(l=e.find[k])if(d=l(j.matches[0].replace(V,""),R.test(h[0].type)&&b.parentNode||b,f)){h.splice(g,1),a=d.length&&h.join("");if(!a)return w.apply(c,x.call(d,0)),c;break}}}return i(a,m)(d,b,f,c,R.test(a)),c}function bq(){}var c,d,e,f,g,h,i,j,k,l,m=!0,n="undefined",o=("sizcache"+Math.random()).replace(".",""),q=String,r=a.document,s=r.documentElement,t=0,u=0,v=[].pop,w=[].push,x=[].slice,y=[].indexOf||function(a){var b=0,c=this.length;for(;b<c;b++)if(this[b]===a)return b;return-1},z=function(a,b){return a[o]=b==null||b,a},A=function(){var a={},b=[];return z(function(c,d){return b.push(c)>e.cacheLength&&delete a[b.shift()],a[c]=d},a)},B=A(),C=A(),D=A(),E="[\\x20\\t\\r\\n\\f]",F="(?:\\\\.|[-\\w]|[^\\x00-\\xa0])+",G=F.replace("w","w#"),H="([*^$|!~]?=)",I="\\["+E+"*("+F+")"+E+"*(?:"+H+E+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+G+")|)|)"+E+"*\\]",J=":("+F+")(?:\\((?:(['\"])((?:\\\\.|[^\\\\])*?)\\2|([^()[\\]]*|(?:(?:"+I+")|[^:]|\\\\.)*|.*))\\)|)",K=":(even|odd|eq|gt|lt|nth|first|last)(?:\\("+E+"*((?:-\\d)?\\d*)"+E+"*\\)|)(?=[^-]|$)",L=new RegExp("^"+E+"+|((?:^|[^\\\\])(?:\\\\.)*)"+E+"+$","g"),M=new RegExp("^"+E+"*,"+E+"*"),N=new RegExp("^"+E+"*([\\x20\\t\\r\\n\\f>+~])"+E+"*"),O=new RegExp(J),P=/^(?:#([\w\-]+)|(\w+)|\.([\w\-]+))$/,Q=/^:not/,R=/[\x20\t\r\n\f]*[+~]/,S=/:not\($/,T=/h\d/i,U=/input|select|textarea|button/i,V=/\\(?!\\)/g,W={ID:new RegExp("^#("+F+")"),CLASS:new RegExp("^\\.("+F+")"),NAME:new RegExp("^\\[name=['\"]?("+F+")['\"]?\\]"),TAG:new RegExp("^("+F.replace("w","w*")+")"),ATTR:new RegExp("^"+I),PSEUDO:new RegExp("^"+J),POS:new RegExp(K,"i"),CHILD:new RegExp("^:(only|nth|first|last)-child(?:\\("+E+"*(even|odd|(([+-]|)(\\d*)n|)"+E+"*(?:([+-]|)"+E+"*(\\d+)|))"+E+"*\\)|)","i"),needsContext:new RegExp("^"+E+"*[>+~]|"+K,"i")},X=function(a){var b=r.createElement("div");try{return a(b)}catch(c){return!1}finally{b=null}},Y=X(function(a){return a.appendChild(r.createComment("")),!a.getElementsByTagName("*").length}),Z=X(function(a){return a.innerHTML="<a href='#'></a>",a.firstChild&&typeof a.firstChild.getAttribute!==n&&a.firstChild.getAttribute("href")==="#"}),$=X(function(a){a.innerHTML="<select></select>";var b=typeof a.lastChild.getAttribute("multiple");return b!=="boolean"&&b!=="string"}),_=X(function(a){return a.innerHTML="<div class='hidden e'></div><div class='hidden'></div>",!a.getElementsByClassName||!a.getElementsByClassName("e").length?!1:(a.lastChild.className="e",a.getElementsByClassName("e").length===2)}),ba=X(function(a){a.id=o+0,a.innerHTML="<a name='"+o+"'></a><div name='"+o+"'></div>",s.insertBefore(a,s.firstChild);var b=r.getElementsByName&&r.getElementsByName(o).length===2+r.getElementsByName(o+0).length;return d=!r.getElementById(o),s.removeChild(a),b});try{x.call(s.childNodes,0)[0].nodeType}catch(bb){x=function(a){var b,c=[];for(;b=this[a];a++)c.push(b);return c}}bc.matches=function(a,b){return bc(a,null,null,b)},bc.matchesSelector=function(a,b){return bc(b,null,null,[a]).length>0},f=bc.getText=function(a){var b,c="",d=0,e=a.nodeType;if(e){if(e===1||e===9||e===11){if(typeof a.textContent=="string")return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=f(a)}else if(e===3||e===4)return a.nodeValue}else for(;b=a[d];d++)c+=f(b);return c},g=bc.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return b?b.nodeName!=="HTML":!1},h=bc.contains=s.contains?function(a,b){var c=a.nodeType===9?a.documentElement:a,d=b&&b.parentNode;return a===d||!!(d&&d.nodeType===1&&c.contains&&c.contains(d))}:s.compareDocumentPosition?function(a,b){return b&&!!(a.compareDocumentPosition(b)&16)}:function(a,b){while(b=b.parentNode)if(b===a)return!0;return!1},bc.attr=function(a,b){var c,d=g(a);return d||(b=b.toLowerCase()),(c=e.attrHandle[b])?c(a):d||$?a.getAttribute(b):(c=a.getAttributeNode(b),c?typeof a[b]=="boolean"?a[b]?b:null:c.specified?c.value:null:null)},e=bc.selectors={cacheLength:50,createPseudo:z,match:W,attrHandle:Z?{}:{href:function(a){return a.getAttribute("href",2)},type:function(a){return a.getAttribute("type")}},find:{ID:d?function(a,b,c){if(typeof b.getElementById!==n&&!c){var d=b.getElementById(a);return d&&d.parentNode?[d]:[]}}:function(a,c,d){if(typeof c.getElementById!==n&&!d){var e=c.getElementById(a);return e?e.id===a||typeof e.getAttributeNode!==n&&e.getAttributeNode("id").value===a?[e]:b:[]}},TAG:Y?function(a,b){if(typeof b.getElementsByTagName!==n)return b.getElementsByTagName(a)}:function(a,b){var c=b.getElementsByTagName(a);if(a==="*"){var d,e=[],f=0;for(;d=c[f];f++)d.nodeType===1&&e.push(d);return e}return c},NAME:ba&&function(a,b){if(typeof b.getElementsByName!==n)return b.getElementsByName(name)},CLASS:_&&function(a,b,c){if(typeof b.getElementsByClassName!==n&&!c)return b.getElementsByClassName(a)}},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(V,""),a[3]=(a[4]||a[5]||"").replace(V,""),a[2]==="~="&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),a[1]==="nth"?(a[2]||bc.error(a[0]),a[3]=+(a[3]?a[4]+(a[5]||1):2*(a[2]==="even"||a[2]==="odd")),a[4]=+(a[6]+a[7]||a[2]==="odd")):a[2]&&bc.error(a[0]),a},PSEUDO:function(a){var b,c;if(W.CHILD.test(a[0]))return null;if(a[3])a[2]=a[3];else if(b=a[4])O.test(b)&&(c=bh(b,!0))&&(c=b.indexOf(")",b.length-c)-b.length)&&(b=b.slice(0,c),a[0]=a[0].slice(0,c)),a[2]=b;return a.slice(0,3)}},filter:{ID:d?function(a){return a=a.replace(V,""),function(b){return b.getAttribute("id")===a}}:function(a){return a=a.replace(V,""),function(b){var c=typeof b.getAttributeNode!==n&&b.getAttributeNode("id");return c&&c.value===a}},TAG:function(a){return a==="*"?function(){return!0}:(a=a.replace(V,"").toLowerCase(),function(b){return b.nodeName&&b.nodeName.toLowerCase()===a})},CLASS:function(a){var b=B[o][a];return b||(b=B(a,new RegExp("(^|"+E+")"+a+"("+E+"|$)"))),function(a){return b.test(a.className||typeof a.getAttribute!==n&&a.getAttribute("class")||"")}},ATTR:function(a,b,c){return function(d,e){var f=bc.attr(d,a);return f==null?b==="!=":b?(f+="",b==="="?f===c:b==="!="?f!==c:b==="^="?c&&f.indexOf(c)===0:b==="*="?c&&f.indexOf(c)>-1:b==="$="?c&&f.substr(f.length-c.length)===c:b==="~="?(" "+f+" ").indexOf(c)>-1:b==="|="?f===c||f.substr(0,c.length+1)===c+"-":!1):!0}},CHILD:function(a,b,c,d){return a==="nth"?function(a){var b,e,f=a.parentNode;if(c===1&&d===0)return!0;if(f){e=0;for(b=f.firstChild;b;b=b.nextSibling)if(b.nodeType===1){e++;if(a===b)break}}return e-=d,e===c||e%c===0&&e/c>=0}:function(b){var c=b;switch(a){case"only":case"first":while(c=c.previousSibling)if(c.nodeType===1)return!1;if(a==="first")return!0;c=b;case"last":while(c=c.nextSibling)if(c.nodeType===1)return!1;return!0}}},PSEUDO:function(a,b){var c,d=e.pseudos[a]||e.setFilters[a.toLowerCase()]||bc.error("unsupported pseudo: "+a);return d[o]?d(b):d.length>1?(c=[a,a,"",b],e.setFilters.hasOwnProperty(a.toLowerCase())?z(function(a,c){var e,f=d(a,b),g=f.length;while(g--)e=y.call(a,f[g]),a[e]=!(c[e]=f[g])}):function(a){return d(a,0,c)}):d}},pseudos:{not:z(function(a){var b=[],c=[],d=i(a.replace(L,"$1"));return d[o]?z(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)if(f=g[h])a[h]=!(b[h]=f)}):function(a,e,f){return b[0]=a,d(b,null,f,c),!c.pop()}}),has:z(function(a){return function(b){return bc(a,b).length>0}}),contains:z(function(a){return function(b){return(b.textContent||b.innerText||f(b)).indexOf(a)>-1}}),enabled:function(a){return a.disabled===!1},disabled:function(a){return a.disabled===!0},checked:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&!!a.checked||b==="option"&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},parent:function(a){return!e.pseudos.empty(a)},empty:function(a){var b;a=a.firstChild;while(a){if(a.nodeName>"@"||(b=a.nodeType)===3||b===4)return!1;a=a.nextSibling}return!0},header:function(a){return T.test(a.nodeName)},text:function(a){var b,c;return a.nodeName.toLowerCase()==="input"&&(b=a.type)==="text"&&((c=a.getAttribute("type"))==null||c.toLowerCase()===b)},radio:bd("radio"),checkbox:bd("checkbox"),file:bd("file"),password:bd("password"),image:bd("image"),submit:be("submit"),reset:be("reset"),button:function(a){var b=a.nodeName.toLowerCase();return b==="input"&&a.type==="button"||b==="button"},input:function(a){return U.test(a.nodeName)},focus:function(a){var b=a.ownerDocument;return a===b.activeElement&&(!b.hasFocus||b.hasFocus())&&(!!a.type||!!a.href)},active:function(a){return a===a.ownerDocument.activeElement},first:bf(function(a,b,c){return[0]}),last:bf(function(a,b,c){return[b-1]}),eq:bf(function(a,b,c){return[c<0?c+b:c]}),even:bf(function(a,b,c){for(var d=0;d<b;d+=2)a.push(d);return a}),odd:bf(function(a,b,c){for(var d=1;d<b;d+=2)a.push(d);return a}),lt:bf(function(a,b,c){for(var d=c<0?c+b:c;--d>=0;)a.push(d);return a}),gt:bf(function(a,b,c){for(var d=c<0?c+b:c;++d<b;)a.push(d);return a})}},j=s.compareDocumentPosition?function(a,b){return a===b?(k=!0,0):(!a.compareDocumentPosition||!b.compareDocumentPosition?a.compareDocumentPosition:a.compareDocumentPosition(b)&4)?-1:1}:function(a,b){if(a===b)return k=!0,0;if(a.sourceIndex&&b.sourceIndex)return a.sourceIndex-b.sourceIndex;var c,d,e=[],f=[],g=a.parentNode,h=b.parentNode,i=g;if(g===h)return bg(a,b);if(!g)return-1;if(!h)return 1;while(i)e.unshift(i),i=i.parentNode;i=h;while(i)f.unshift(i),i=i.parentNode;c=e.length,d=f.length;for(var j=0;j<c&&j<d;j++)if(e[j]!==f[j])return bg(e[j],f[j]);return j===c?bg(a,f[j],-1):bg(e[j],b,1)},[0,0].sort(j),m=!k,bc.uniqueSort=function(a){var b,c=1;k=m,a.sort(j);if(k)for(;b=a[c];c++)b===a[c-1]&&a.splice(c--,1);return a},bc.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},i=bc.compile=function(a,b){var c,d=[],e=[],f=D[o][a];if(!f){b||(b=bh(a)),c=b.length;while(c--)f=bm(b[c]),f[o]?d.push(f):e.push(f);f=D(a,bn(e,d))}return f},r.querySelectorAll&&function(){var a,b=bp,c=/'|\\/g,d=/\=[\x20\t\r\n\f]*([^'"\]]*)[\x20\t\r\n\f]*\]/g,e=[":focus"],f=[":active",":focus"],h=s.matchesSelector||s.mozMatchesSelector||s.webkitMatchesSelector||s.oMatchesSelector||s.msMatchesSelector;X(function(a){a.innerHTML="<select><option selected=''></option></select>",a.querySelectorAll("[selected]").length||e.push("\\["+E+"*(?:checked|disabled|ismap|multiple|readonly|selected|value)"),a.querySelectorAll(":checked").length||e.push(":checked")}),X(function(a){a.innerHTML="<p test=''></p>",a.querySelectorAll("[test^='']").length&&e.push("[*^$]="+E+"*(?:\"\"|'')"),a.innerHTML="<input type='hidden'/>",a.querySelectorAll(":enabled").length||e.push(":enabled",":disabled")}),e=new RegExp(e.join("|")),bp=function(a,d,f,g,h){if(!g&&!h&&(!e||!e.test(a))){var i,j,k=!0,l=o,m=d,n=d.nodeType===9&&a;if(d.nodeType===1&&d.nodeName.toLowerCase()!=="object"){i=bh(a),(k=d.getAttribute("id"))?l=k.replace(c,"\\$&"):d.setAttribute("id",l),l="[id='"+l+"'] ",j=i.length;while(j--)i[j]=l+i[j].join("");m=R.test(a)&&d.parentNode||d,n=i.join(",")}if(n)try{return w.apply(f,x.call(m.querySelectorAll(n),0)),f}catch(p){}finally{k||d.removeAttribute("id")}}return b(a,d,f,g,h)},h&&(X(function(b){a=h.call(b,"div");try{h.call(b,"[test!='']:sizzle"),f.push("!=",J)}catch(c){}}),f=new RegExp(f.join("|")),bc.matchesSelector=function(b,c){c=c.replace(d,"='$1']");if(!g(b)&&!f.test(c)&&(!e||!e.test(c)))try{var i=h.call(b,c);if(i||a||b.document&&b.document.nodeType!==11)return i}catch(j){}return bc(c,null,null,[b]).length>0})}(),e.pseudos.nth=e.pseudos.eq,e.filters=bq.prototype=e.pseudos,e.setFilters=new bq,bc.attr=p.attr,p.find=bc,p.expr=bc.selectors,p.expr[":"]=p.expr.pseudos,p.unique=bc.uniqueSort,p.text=bc.getText,p.isXMLDoc=bc.isXML,p.contains=bc.contains}(a);var bc=/Until$/,bd=/^(?:parents|prev(?:Until|All))/,be=/^.[^:#\[\.,]*$/,bf=p.expr.match.needsContext,bg={children:!0,contents:!0,next:!0,prev:!0};p.fn.extend({find:function(a){var b,c,d,e,f,g,h=this;if(typeof a!="string")return p(a).filter(function(){for(b=0,c=h.length;b<c;b++)if(p.contains(h[b],this))return!0});g=this.pushStack("","find",a);for(b=0,c=this.length;b<c;b++){d=g.length,p.find(a,this[b],g);if(b>0)for(e=d;e<g.length;e++)for(f=0;f<d;f++)if(g[f]===g[e]){g.splice(e--,1);break}}return g},has:function(a){var b,c=p(a,this),d=c.length;return this.filter(function(){for(b=0;b<d;b++)if(p.contains(this,c[b]))return!0})},not:function(a){return this.pushStack(bj(this,a,!1),"not",a)},filter:function(a){return this.pushStack(bj(this,a,!0),"filter",a)},is:function(a){return!!a&&(typeof a=="string"?bf.test(a)?p(a,this.context).index(this[0])>=0:p.filter(a,this).length>0:this.filter(a).length>0)},closest:function(a,b){var c,d=0,e=this.length,f=[],g=bf.test(a)||typeof a!="string"?p(a,b||this.context):0;for(;d<e;d++){c=this[d];while(c&&c.ownerDocument&&c!==b&&c.nodeType!==11){if(g?g.index(c)>-1:p.find.matchesSelector(c,a)){f.push(c);break}c=c.parentNode}}return f=f.length>1?p.unique(f):f,this.pushStack(f,"closest",a)},index:function(a){return a?typeof a=="string"?p.inArray(this[0],p(a)):p.inArray(a.jquery?a[0]:a,this):this[0]&&this[0].parentNode?this.prevAll().length:-1},add:function(a,b){var c=typeof a=="string"?p(a,b):p.makeArray(a&&a.nodeType?[a]:a),d=p.merge(this.get(),c);return this.pushStack(bh(c[0])||bh(d[0])?d:p.unique(d))},addBack:function(a){return this.add(a==null?this.prevObject:this.prevObject.filter(a))}}),p.fn.andSelf=p.fn.addBack,p.each({parent:function(a){var b=a.parentNode;return b&&b.nodeType!==11?b:null},parents:function(a){return p.dir(a,"parentNode")},parentsUntil:function(a,b,c){return p.dir(a,"parentNode",c)},next:function(a){return bi(a,"nextSibling")},prev:function(a){return bi(a,"previousSibling")},nextAll:function(a){return p.dir(a,"nextSibling")},prevAll:function(a){return p.dir(a,"previousSibling")},nextUntil:function(a,b,c){return p.dir(a,"nextSibling",c)},prevUntil:function(a,b,c){return p.dir(a,"previousSibling",c)},siblings:function(a){return p.sibling((a.parentNode||{}).firstChild,a)},children:function(a){return p.sibling(a.firstChild)},contents:function(a){return p.nodeName(a,"iframe")?a.contentDocument||a.contentWindow.document:p.merge([],a.childNodes)}},function(a,b){p.fn[a]=function(c,d){var e=p.map(this,b,c);return bc.test(a)||(d=c),d&&typeof d=="string"&&(e=p.filter(d,e)),e=this.length>1&&!bg[a]?p.unique(e):e,this.length>1&&bd.test(a)&&(e=e.reverse()),this.pushStack(e,a,k.call(arguments).join(","))}}),p.extend({filter:function(a,b,c){return c&&(a=":not("+a+")"),b.length===1?p.find.matchesSelector(b[0],a)?[b[0]]:[]:p.find.matches(a,b)},dir:function(a,c,d){var e=[],f=a[c];while(f&&f.nodeType!==9&&(d===b||f.nodeType!==1||!p(f).is(d)))f.nodeType===1&&e.push(f),f=f[c];return e},sibling:function(a,b){var c=[];for(;a;a=a.nextSibling)a.nodeType===1&&a!==b&&c.push(a);return c}});var bl="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",bm=/ jQuery\d+="(?:null|\d+)"/g,bn=/^\s+/,bo=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,bp=/<([\w:]+)/,bq=/<tbody/i,br=/<|&#?\w+;/,bs=/<(?:script|style|link)/i,bt=/<(?:script|object|embed|option|style)/i,bu=new RegExp("<(?:"+bl+")[\\s/>]","i"),bv=/^(?:checkbox|radio)$/,bw=/checked\s*(?:[^=]|=\s*.checked.)/i,bx=/\/(java|ecma)script/i,by=/^\s*<!(?:\[CDATA\[|\-\-)|[\]\-]{2}>\s*$/g,bz={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],area:[1,"<map>","</map>"],_default:[0,"",""]},bA=bk(e),bB=bA.appendChild(e.createElement("div"));bz.optgroup=bz.option,bz.tbody=bz.tfoot=bz.colgroup=bz.caption=bz.thead,bz.th=bz.td,p.support.htmlSerialize||(bz._default=[1,"X<div>","</div>"]),p.fn.extend({text:function(a){return p.access(this,function(a){return a===b?p.text(this):this.empty().append((this[0]&&this[0].ownerDocument||e).createTextNode(a))},null,a,arguments.length)},wrapAll:function(a){if(p.isFunction(a))return this.each(function(b){p(this).wrapAll(a.call(this,b))});if(this[0]){var b=p(a,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&b.insertBefore(this[0]),b.map(function(){var a=this;while(a.firstChild&&a.firstChild.nodeType===1)a=a.firstChild;return a}).append(this)}return this},wrapInner:function(a){return p.isFunction(a)?this.each(function(b){p(this).wrapInner(a.call(this,b))}):this.each(function(){var b=p(this),c=b.contents();c.length?c.wrapAll(a):b.append(a)})},wrap:function(a){var b=p.isFunction(a);return this.each(function(c){p(this).wrapAll(b?a.call(this,c):a)})},unwrap:function(){return this.parent().each(function(){p.nodeName(this,"body")||p(this).replaceWith(this.childNodes)}).end()},append:function(){return this.domManip(arguments,!0,function(a){(this.nodeType===1||this.nodeType===11)&&this.appendChild(a)})},prepend:function(){return this.domManip(arguments,!0,function(a){(this.nodeType===1||this.nodeType===11)&&this.insertBefore(a,this.firstChild)})},before:function(){if(!bh(this[0]))return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this)});if(arguments.length){var a=p.clean(arguments);return this.pushStack(p.merge(a,this),"before",this.selector)}},after:function(){if(!bh(this[0]))return this.domManip(arguments,!1,function(a){this.parentNode.insertBefore(a,this.nextSibling)});if(arguments.length){var a=p.clean(arguments);return this.pushStack(p.merge(this,a),"after",this.selector)}},remove:function(a,b){var c,d=0;for(;(c=this[d])!=null;d++)if(!a||p.filter(a,[c]).length)!b&&c.nodeType===1&&(p.cleanData(c.getElementsByTagName("*")),p.cleanData([c])),c.parentNode&&c.parentNode.removeChild(c);return this},empty:function(){var a,b=0;for(;(a=this[b])!=null;b++){a.nodeType===1&&p.cleanData(a.getElementsByTagName("*"));while(a.firstChild)a.removeChild(a.firstChild)}return this},clone:function(a,b){return a=a==null?!1:a,b=b==null?a:b,this.map(function(){return p.clone(this,a,b)})},html:function(a){return p.access(this,function(a){var c=this[0]||{},d=0,e=this.length;if(a===b)return c.nodeType===1?c.innerHTML.replace(bm,""):b;if(typeof a=="string"&&!bs.test(a)&&(p.support.htmlSerialize||!bu.test(a))&&(p.support.leadingWhitespace||!bn.test(a))&&!bz[(bp.exec(a)||["",""])[1].toLowerCase()]){a=a.replace(bo,"<$1></$2>");try{for(;d<e;d++)c=this[d]||{},c.nodeType===1&&(p.cleanData(c.getElementsByTagName("*")),c.innerHTML=a);c=0}catch(f){}}c&&this.empty().append(a)},null,a,arguments.length)},replaceWith:function(a){return bh(this[0])?this.length?this.pushStack(p(p.isFunction(a)?a():a),"replaceWith",a):this:p.isFunction(a)?this.each(function(b){var c=p(this),d=c.html();c.replaceWith(a.call(this,b,d))}):(typeof a!="string"&&(a=p(a).detach()),this.each(function(){var b=this.nextSibling,c=this.parentNode;p(this).remove(),b?p(b).before(a):p(c).append(a)}))},detach:function(a){return this.remove(a,!0)},domManip:function(a,c,d){a=[].concat.apply([],a);var e,f,g,h,i=0,j=a[0],k=[],l=this.length;if(!p.support.checkClone&&l>1&&typeof j=="string"&&bw.test(j))return this.each(function(){p(this).domManip(a,c,d)});if(p.isFunction(j))return this.each(function(e){var f=p(this);a[0]=j.call(this,e,c?f.html():b),f.domManip(a,c,d)});if(this[0]){e=p.buildFragment(a,this,k),g=e.fragment,f=g.firstChild,g.childNodes.length===1&&(g=f);if(f){c=c&&p.nodeName(f,"tr");for(h=e.cacheable||l-1;i<l;i++)d.call(c&&p.nodeName(this[i],"table")?bC(this[i],"tbody"):this[i],i===h?g:p.clone(g,!0,!0))}g=f=null,k.length&&p.each(k,function(a,b){b.src?p.ajax?p.ajax({url:b.src,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0}):p.error("no ajax"):p.globalEval((b.text||b.textContent||b.innerHTML||"").replace(by,"")),b.parentNode&&b.parentNode.removeChild(b)})}return this}}),p.buildFragment=function(a,c,d){var f,g,h,i=a[0];return c=c||e,c=!c.nodeType&&c[0]||c,c=c.ownerDocument||c,a.length===1&&typeof i=="string"&&i.length<512&&c===e&&i.charAt(0)==="<"&&!bt.test(i)&&(p.support.checkClone||!bw.test(i))&&(p.support.html5Clone||!bu.test(i))&&(g=!0,f=p.fragments[i],h=f!==b),f||(f=c.createDocumentFragment(),p.clean(a,c,f,d),g&&(p.fragments[i]=h&&f)),{fragment:f,cacheable:g}},p.fragments={},p.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(a,b){p.fn[a]=function(c){var d,e=0,f=[],g=p(c),h=g.length,i=this.length===1&&this[0].parentNode;if((i==null||i&&i.nodeType===11&&i.childNodes.length===1)&&h===1)return g[b](this[0]),this;for(;e<h;e++)d=(e>0?this.clone(!0):this).get(),p(g[e])[b](d),f=f.concat(d);return this.pushStack(f,a,g.selector)}}),p.extend({clone:function(a,b,c){var d,e,f,g;p.support.html5Clone||p.isXMLDoc(a)||!bu.test("<"+a.nodeName+">")?g=a.cloneNode(!0):(bB.innerHTML=a.outerHTML,bB.removeChild(g=bB.firstChild));if((!p.support.noCloneEvent||!p.support.noCloneChecked)&&(a.nodeType===1||a.nodeType===11)&&!p.isXMLDoc(a)){bE(a,g),d=bF(a),e=bF(g);for(f=0;d[f];++f)e[f]&&bE(d[f],e[f])}if(b){bD(a,g);if(c){d=bF(a),e=bF(g);for(f=0;d[f];++f)bD(d[f],e[f])}}return d=e=null,g},clean:function(a,b,c,d){var f,g,h,i,j,k,l,m,n,o,q,r,s=b===e&&bA,t=[];if(!b||typeof b.createDocumentFragment=="undefined")b=e;for(f=0;(h=a[f])!=null;f++){typeof h=="number"&&(h+="");if(!h)continue;if(typeof h=="string")if(!br.test(h))h=b.createTextNode(h);else{s=s||bk(b),l=b.createElement("div"),s.appendChild(l),h=h.replace(bo,"<$1></$2>"),i=(bp.exec(h)||["",""])[1].toLowerCase(),j=bz[i]||bz._default,k=j[0],l.innerHTML=j[1]+h+j[2];while(k--)l=l.lastChild;if(!p.support.tbody){m=bq.test(h),n=i==="table"&&!m?l.firstChild&&l.firstChild.childNodes:j[1]==="<table>"&&!m?l.childNodes:[];for(g=n.length-1;g>=0;--g)p.nodeName(n[g],"tbody")&&!n[g].childNodes.length&&n[g].parentNode.removeChild(n[g])}!p.support.leadingWhitespace&&bn.test(h)&&l.insertBefore(b.createTextNode(bn.exec(h)[0]),l.firstChild),h=l.childNodes,l.parentNode.removeChild(l)}h.nodeType?t.push(h):p.merge(t,h)}l&&(h=l=s=null);if(!p.support.appendChecked)for(f=0;(h=t[f])!=null;f++)p.nodeName(h,"input")?bG(h):typeof h.getElementsByTagName!="undefined"&&p.grep(h.getElementsByTagName("input"),bG);if(c){q=function(a){if(!a.type||bx.test(a.type))return d?d.push(a.parentNode?a.parentNode.removeChild(a):a):c.appendChild(a)};for(f=0;(h=t[f])!=null;f++)if(!p.nodeName(h,"script")||!q(h))c.appendChild(h),typeof h.getElementsByTagName!="undefined"&&(r=p.grep(p.merge([],h.getElementsByTagName("script")),q),t.splice.apply(t,[f+1,0].concat(r)),f+=r.length)}return t},cleanData:function(a,b){var c,d,e,f,g=0,h=p.expando,i=p.cache,j=p.support.deleteExpando,k=p.event.special;for(;(e=a[g])!=null;g++)if(b||p.acceptData(e)){d=e[h],c=d&&i[d];if(c){if(c.events)for(f in c.events)k[f]?p.event.remove(e,f):p.removeEvent(e,f,c.handle);i[d]&&(delete i[d],j?delete e[h]:e.removeAttribute?e.removeAttribute(h):e[h]=null,p.deletedIds.push(d))}}}}),function(){var a,b;p.uaMatch=function(a){a=a.toLowerCase();var b=/(chrome)[ \/]([\w.]+)/.exec(a)||/(webkit)[ \/]([\w.]+)/.exec(a)||/(opera)(?:.*version|)[ \/]([\w.]+)/.exec(a)||/(msie) ([\w.]+)/.exec(a)||a.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(a)||[];return{browser:b[1]||"",version:b[2]||"0"}},a=p.uaMatch(g.userAgent),b={},a.browser&&(b[a.browser]=!0,b.version=a.version),b.chrome?b.webkit=!0:b.webkit&&(b.safari=!0),p.browser=b,p.sub=function(){function a(b,c){return new a.fn.init(b,c)}p.extend(!0,a,this),a.superclass=this,a.fn=a.prototype=this(),a.fn.constructor=a,a.sub=this.sub,a.fn.init=function c(c,d){return d&&d instanceof p&&!(d instanceof a)&&(d=a(d)),p.fn.init.call(this,c,d,b)},a.fn.init.prototype=a.fn;var b=a(e);return a}}();var bH,bI,bJ,bK=/alpha\([^)]*\)/i,bL=/opacity=([^)]*)/,bM=/^(top|right|bottom|left)$/,bN=/^(none|table(?!-c[ea]).+)/,bO=/^margin/,bP=new RegExp("^("+q+")(.*)$","i"),bQ=new RegExp("^("+q+")(?!px)[a-z%]+$","i"),bR=new RegExp("^([-+])=("+q+")","i"),bS={},bT={position:"absolute",visibility:"hidden",display:"block"},bU={letterSpacing:0,fontWeight:400},bV=["Top","Right","Bottom","Left"],bW=["Webkit","O","Moz","ms"],bX=p.fn.toggle;p.fn.extend({css:function(a,c){return p.access(this,function(a,c,d){return d!==b?p.style(a,c,d):p.css(a,c)},a,c,arguments.length>1)},show:function(){return b$(this,!0)},hide:function(){return b$(this)},toggle:function(a,b){var c=typeof a=="boolean";return p.isFunction(a)&&p.isFunction(b)?bX.apply(this,arguments):this.each(function(){(c?a:bZ(this))?p(this).show():p(this).hide()})}}),p.extend({cssHooks:{opacity:{get:function(a,b){if(b){var c=bH(a,"opacity");return c===""?"1":c}}}},cssNumber:{fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":p.support.cssFloat?"cssFloat":"styleFloat"},style:function(a,c,d,e){if(!a||a.nodeType===3||a.nodeType===8||!a.style)return;var f,g,h,i=p.camelCase(c),j=a.style;c=p.cssProps[i]||(p.cssProps[i]=bY(j,i)),h=p.cssHooks[c]||p.cssHooks[i];if(d===b)return h&&"get"in h&&(f=h.get(a,!1,e))!==b?f:j[c];g=typeof d,g==="string"&&(f=bR.exec(d))&&(d=(f[1]+1)*f[2]+parseFloat(p.css(a,c)),g="number");if(d==null||g==="number"&&isNaN(d))return;g==="number"&&!p.cssNumber[i]&&(d+="px");if(!h||!("set"in h)||(d=h.set(a,d,e))!==b)try{j[c]=d}catch(k){}},css:function(a,c,d,e){var f,g,h,i=p.camelCase(c);return c=p.cssProps[i]||(p.cssProps[i]=bY(a.style,i)),h=p.cssHooks[c]||p.cssHooks[i],h&&"get"in h&&(f=h.get(a,!0,e)),f===b&&(f=bH(a,c)),f==="normal"&&c in bU&&(f=bU[c]),d||e!==b?(g=parseFloat(f),d||p.isNumeric(g)?g||0:f):f},swap:function(a,b,c){var d,e,f={};for(e in b)f[e]=a.style[e],a.style[e]=b[e];d=c.call(a);for(e in b)a.style[e]=f[e];return d}}),a.getComputedStyle?bH=function(b,c){var d,e,f,g,h=a.getComputedStyle(b,null),i=b.style;return h&&(d=h[c],d===""&&!p.contains(b.ownerDocument,b)&&(d=p.style(b,c)),bQ.test(d)&&bO.test(c)&&(e=i.width,f=i.minWidth,g=i.maxWidth,i.minWidth=i.maxWidth=i.width=d,d=h.width,i.width=e,i.minWidth=f,i.maxWidth=g)),d}:e.documentElement.currentStyle&&(bH=function(a,b){var c,d,e=a.currentStyle&&a.currentStyle[b],f=a.style;return e==null&&f&&f[b]&&(e=f[b]),bQ.test(e)&&!bM.test(b)&&(c=f.left,d=a.runtimeStyle&&a.runtimeStyle.left,d&&(a.runtimeStyle.left=a.currentStyle.left),f.left=b==="fontSize"?"1em":e,e=f.pixelLeft+"px",f.left=c,d&&(a.runtimeStyle.left=d)),e===""?"auto":e}),p.each(["height","width"],function(a,b){p.cssHooks[b]={get:function(a,c,d){if(c)return a.offsetWidth===0&&bN.test(bH(a,"display"))?p.swap(a,bT,function(){return cb(a,b,d)}):cb(a,b,d)},set:function(a,c,d){return b_(a,c,d?ca(a,b,d,p.support.boxSizing&&p.css(a,"boxSizing")==="border-box"):0)}}}),p.support.opacity||(p.cssHooks.opacity={get:function(a,b){return bL.test((b&&a.currentStyle?a.currentStyle.filter:a.style.filter)||"")?.01*parseFloat(RegExp.$1)+"":b?"1":""},set:function(a,b){var c=a.style,d=a.currentStyle,e=p.isNumeric(b)?"alpha(opacity="+b*100+")":"",f=d&&d.filter||c.filter||"";c.zoom=1;if(b>=1&&p.trim(f.replace(bK,""))===""&&c.removeAttribute){c.removeAttribute("filter");if(d&&!d.filter)return}c.filter=bK.test(f)?f.replace(bK,e):f+" "+e}}),p(function(){p.support.reliableMarginRight||(p.cssHooks.marginRight={get:function(a,b){return p.swap(a,{display:"inline-block"},function(){if(b)return bH(a,"marginRight")})}}),!p.support.pixelPosition&&p.fn.position&&p.each(["top","left"],function(a,b){p.cssHooks[b]={get:function(a,c){if(c){var d=bH(a,b);return bQ.test(d)?p(a).position()[b]+"px":d}}}})}),p.expr&&p.expr.filters&&(p.expr.filters.hidden=function(a){return a.offsetWidth===0&&a.offsetHeight===0||!p.support.reliableHiddenOffsets&&(a.style&&a.style.display||bH(a,"display"))==="none"},p.expr.filters.visible=function(a){return!p.expr.filters.hidden(a)}),p.each({margin:"",padding:"",border:"Width"},function(a,b){p.cssHooks[a+b]={expand:function(c){var d,e=typeof c=="string"?c.split(" "):[c],f={};for(d=0;d<4;d++)f[a+bV[d]+b]=e[d]||e[d-2]||e[0];return f}},bO.test(a)||(p.cssHooks[a+b].set=b_)});var cd=/%20/g,ce=/\[\]$/,cf=/\r?\n/g,cg=/^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,ch=/^(?:select|textarea)/i;p.fn.extend({serialize:function(){return p.param(this.serializeArray())},serializeArray:function(){return this.map(function(){return this.elements?p.makeArray(this.elements):this}).filter(function(){return this.name&&!this.disabled&&(this.checked||ch.test(this.nodeName)||cg.test(this.type))}).map(function(a,b){var c=p(this).val();return c==null?null:p.isArray(c)?p.map(c,function(a,c){return{name:b.name,value:a.replace(cf,"\r\n")}}):{name:b.name,value:c.replace(cf,"\r\n")}}).get()}}),p.param=function(a,c){var d,e=[],f=function(a,b){b=p.isFunction(b)?b():b==null?"":b,e[e.length]=encodeURIComponent(a)+"="+encodeURIComponent(b)};c===b&&(c=p.ajaxSettings&&p.ajaxSettings.traditional);if(p.isArray(a)||a.jquery&&!p.isPlainObject(a))p.each(a,function(){f(this.name,this.value)});else for(d in a)ci(d,a[d],c,f);return e.join("&").replace(cd,"+")};var cj,ck,cl=/#.*$/,cm=/^(.*?):[ \t]*([^\r\n]*)\r?$/mg,cn=/^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,co=/^(?:GET|HEAD)$/,cp=/^\/\//,cq=/\?/,cr=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,cs=/([?&])_=[^&]*/,ct=/^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,cu=p.fn.load,cv={},cw={},cx=["*/"]+["*"];try{ck=f.href}catch(cy){ck=e.createElement("a"),ck.href="",ck=ck.href}cj=ct.exec(ck.toLowerCase())||[],p.fn.load=function(a,c,d){if(typeof a!="string"&&cu)return cu.apply(this,arguments);if(!this.length)return this;var e,f,g,h=this,i=a.indexOf(" ");return i>=0&&(e=a.slice(i,a.length),a=a.slice(0,i)),p.isFunction(c)?(d=c,c=b):c&&typeof c=="object"&&(f="POST"),p.ajax({url:a,type:f,dataType:"html",data:c,complete:function(a,b){d&&h.each(d,g||[a.responseText,b,a])}}).done(function(a){g=arguments,h.html(e?p("<div>").append(a.replace(cr,"")).find(e):a)}),this},p.each("ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split(" "),function(a,b){p.fn[b]=function(a){return this.on(b,a)}}),p.each(["get","post"],function(a,c){p[c]=function(a,d,e,f){return p.isFunction(d)&&(f=f||e,e=d,d=b),p.ajax({type:c,url:a,data:d,success:e,dataType:f})}}),p.extend({getScript:function(a,c){return p.get(a,b,c,"script")},getJSON:function(a,b,c){return p.get(a,b,c,"json")},ajaxSetup:function(a,b){return b?cB(a,p.ajaxSettings):(b=a,a=p.ajaxSettings),cB(a,b),a},ajaxSettings:{url:ck,isLocal:cn.test(cj[1]),global:!0,type:"GET",contentType:"application/x-www-form-urlencoded; charset=UTF-8",processData:!0,async:!0,accepts:{xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript","*":cx},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText"},converters:{"* text":a.String,"text html":!0,"text json":p.parseJSON,"text xml":p.parseXML},flatOptions:{context:!0,url:!0}},ajaxPrefilter:cz(cv),ajaxTransport:cz(cw),ajax:function(a,c){function y(a,c,f,i){var k,s,t,u,w,y=c;if(v===2)return;v=2,h&&clearTimeout(h),g=b,e=i||"",x.readyState=a>0?4:0,f&&(u=cC(l,x,f));if(a>=200&&a<300||a===304)l.ifModified&&(w=x.getResponseHeader("Last-Modified"),w&&(p.lastModified[d]=w),w=x.getResponseHeader("Etag"),w&&(p.etag[d]=w)),a===304?(y="notmodified",k=!0):(k=cD(l,u),y=k.state,s=k.data,t=k.error,k=!t);else{t=y;if(!y||a)y="error",a<0&&(a=0)}x.status=a,x.statusText=(c||y)+"",k?o.resolveWith(m,[s,y,x]):o.rejectWith(m,[x,y,t]),x.statusCode(r),r=b,j&&n.trigger("ajax"+(k?"Success":"Error"),[x,l,k?s:t]),q.fireWith(m,[x,y]),j&&(n.trigger("ajaxComplete",[x,l]),--p.active||p.event.trigger("ajaxStop"))}typeof a=="object"&&(c=a,a=b),c=c||{};var d,e,f,g,h,i,j,k,l=p.ajaxSetup({},c),m=l.context||l,n=m!==l&&(m.nodeType||m instanceof p)?p(m):p.event,o=p.Deferred(),q=p.Callbacks("once memory"),r=l.statusCode||{},t={},u={},v=0,w="canceled",x={readyState:0,setRequestHeader:function(a,b){if(!v){var c=a.toLowerCase();a=u[c]=u[c]||a,t[a]=b}return this},getAllResponseHeaders:function(){return v===2?e:null},getResponseHeader:function(a){var c;if(v===2){if(!f){f={};while(c=cm.exec(e))f[c[1].toLowerCase()]=c[2]}c=f[a.toLowerCase()]}return c===b?null:c},overrideMimeType:function(a){return v||(l.mimeType=a),this},abort:function(a){return a=a||w,g&&g.abort(a),y(0,a),this}};o.promise(x),x.success=x.done,x.error=x.fail,x.complete=q.add,x.statusCode=function(a){if(a){var b;if(v<2)for(b in a)r[b]=[r[b],a[b]];else b=a[x.status],x.always(b)}return this},l.url=((a||l.url)+"").replace(cl,"").replace(cp,cj[1]+"//"),l.dataTypes=p.trim(l.dataType||"*").toLowerCase().split(s),l.crossDomain==null&&(i=ct.exec(l.url.toLowerCase())||!1,l.crossDomain=i&&i.join(":")+(i[3]?"":i[1]==="http:"?80:443)!==cj.join(":")+(cj[3]?"":cj[1]==="http:"?80:443)),l.data&&l.processData&&typeof l.data!="string"&&(l.data=p.param(l.data,l.traditional)),cA(cv,l,c,x);if(v===2)return x;j=l.global,l.type=l.type.toUpperCase(),l.hasContent=!co.test(l.type),j&&p.active++===0&&p.event.trigger("ajaxStart");if(!l.hasContent){l.data&&(l.url+=(cq.test(l.url)?"&":"?")+l.data,delete l.data),d=l.url;if(l.cache===!1){var z=p.now(),A=l.url.replace(cs,"$1_="+z);l.url=A+(A===l.url?(cq.test(l.url)?"&":"?")+"_="+z:"")}}(l.data&&l.hasContent&&l.contentType!==!1||c.contentType)&&x.setRequestHeader("Content-Type",l.contentType),l.ifModified&&(d=d||l.url,p.lastModified[d]&&x.setRequestHeader("If-Modified-Since",p.lastModified[d]),p.etag[d]&&x.setRequestHeader("If-None-Match",p.etag[d])),x.setRequestHeader("Accept",l.dataTypes[0]&&l.accepts[l.dataTypes[0]]?l.accepts[l.dataTypes[0]]+(l.dataTypes[0]!=="*"?", "+cx+"; q=0.01":""):l.accepts["*"]);for(k in l.headers)x.setRequestHeader(k,l.headers[k]);if(!l.beforeSend||l.beforeSend.call(m,x,l)!==!1&&v!==2){w="abort";for(k in{success:1,error:1,complete:1})x[k](l[k]);g=cA(cw,l,c,x);if(!g)y(-1,"No Transport");else{x.readyState=1,j&&n.trigger("ajaxSend",[x,l]),l.async&&l.timeout>0&&(h=setTimeout(function(){x.abort("timeout")},l.timeout));try{v=1,g.send(t,y)}catch(B){if(v<2)y(-1,B);else throw B}}return x}return x.abort()},active:0,lastModified:{},etag:{}});var cE=[],cF=/\?/,cG=/(=)\?(?=&|$)|\?\?/,cH=p.now();p.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var a=cE.pop()||p.expando+"_"+cH++;return this[a]=!0,a}}),p.ajaxPrefilter("json jsonp",function(c,d,e){var f,g,h,i=c.data,j=c.url,k=c.jsonp!==!1,l=k&&cG.test(j),m=k&&!l&&typeof i=="string"&&!(c.contentType||"").indexOf("application/x-www-form-urlencoded")&&cG.test(i);if(c.dataTypes[0]==="jsonp"||l||m)return f=c.jsonpCallback=p.isFunction(c.jsonpCallback)?c.jsonpCallback():c.jsonpCallback,g=a[f],l?c.url=j.replace(cG,"$1"+f):m?c.data=i.replace(cG,"$1"+f):k&&(c.url+=(cF.test(j)?"&":"?")+c.jsonp+"="+f),c.converters["script json"]=function(){return h||p.error(f+" was not called"),h[0]},c.dataTypes[0]="json",a[f]=function(){h=arguments},e.always(function(){a[f]=g,c[f]&&(c.jsonpCallback=d.jsonpCallback,cE.push(f)),h&&p.isFunction(g)&&g(h[0]),h=g=b}),"script"}),p.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/javascript|ecmascript/},converters:{"text script":function(a){return p.globalEval(a),a}}}),p.ajaxPrefilter("script",function(a){a.cache===b&&(a.cache=!1),a.crossDomain&&(a.type="GET",a.global=!1)}),p.ajaxTransport("script",function(a){if(a.crossDomain){var c,d=e.head||e.getElementsByTagName("head")[0]||e.documentElement;return{send:function(f,g){c=e.createElement("script"),c.async="async",a.scriptCharset&&(c.charset=a.scriptCharset),c.src=a.url,c.onload=c.onreadystatechange=function(a,e){if(e||!c.readyState||/loaded|complete/.test(c.readyState))c.onload=c.onreadystatechange=null,d&&c.parentNode&&d.removeChild(c),c=b,e||g(200,"success")},d.insertBefore(c,d.firstChild)},abort:function(){c&&c.onload(0,1)}}}});var cI,cJ=a.ActiveXObject?function(){for(var a in cI)cI[a](0,1)}:!1,cK=0;p.ajaxSettings.xhr=a.ActiveXObject?function(){return!this.isLocal&&cL()||cM()}:cL,function(a){p.extend(p.support,{ajax:!!a,cors:!!a&&"withCredentials"in a})}(p.ajaxSettings.xhr()),p.support.ajax&&p.ajaxTransport(function(c){if(!c.crossDomain||p.support.cors){var d;return{send:function(e,f){var g,h,i=c.xhr();c.username?i.open(c.type,c.url,c.async,c.username,c.password):i.open(c.type,c.url,c.async);if(c.xhrFields)for(h in c.xhrFields)i[h]=c.xhrFields[h];c.mimeType&&i.overrideMimeType&&i.overrideMimeType(c.mimeType),!c.crossDomain&&!e["X-Requested-With"]&&(e["X-Requested-With"]="XMLHttpRequest");try{for(h in e)i.setRequestHeader(h,e[h])}catch(j){}i.send(c.hasContent&&c.data||null),d=function(a,e){var h,j,k,l,m;try{if(d&&(e||i.readyState===4)){d=b,g&&(i.onreadystatechange=p.noop,cJ&&delete cI[g]);if(e)i.readyState!==4&&i.abort();else{h=i.status,k=i.getAllResponseHeaders(),l={},m=i.responseXML,m&&m.documentElement&&(l.xml=m);try{l.text=i.responseText}catch(a){}try{j=i.statusText}catch(n){j=""}!h&&c.isLocal&&!c.crossDomain?h=l.text?200:404:h===1223&&(h=204)}}}catch(o){e||f(-1,o)}l&&f(h,j,l,k)},c.async?i.readyState===4?setTimeout(d,0):(g=++cK,cJ&&(cI||(cI={},p(a).unload(cJ)),cI[g]=d),i.onreadystatechange=d):d()},abort:function(){d&&d(0,1)}}}});var cN,cO,cP=/^(?:toggle|show|hide)$/,cQ=new RegExp("^(?:([-+])=|)("+q+")([a-z%]*)$","i"),cR=/queueHooks$/,cS=[cY],cT={"*":[function(a,b){var c,d,e=this.createTween(a,b),f=cQ.exec(b),g=e.cur(),h=+g||0,i=1,j=20;if(f){c=+f[2],d=f[3]||(p.cssNumber[a]?"":"px");if(d!=="px"&&h){h=p.css(e.elem,a,!0)||c||1;do i=i||".5",h=h/i,p.style(e.elem,a,h+d);while(i!==(i=e.cur()/g)&&i!==1&&--j)}e.unit=d,e.start=h,e.end=f[1]?h+(f[1]+1)*c:c}return e}]};p.Animation=p.extend(cW,{tweener:function(a,b){p.isFunction(a)?(b=a,a=["*"]):a=a.split(" ");var c,d=0,e=a.length;for(;d<e;d++)c=a[d],cT[c]=cT[c]||[],cT[c].unshift(b)},prefilter:function(a,b){b?cS.unshift(a):cS.push(a)}}),p.Tween=cZ,cZ.prototype={constructor:cZ,init:function(a,b,c,d,e,f){this.elem=a,this.prop=c,this.easing=e||"swing",this.options=b,this.start=this.now=this.cur(),this.end=d,this.unit=f||(p.cssNumber[c]?"":"px")},cur:function(){var a=cZ.propHooks[this.prop];return a&&a.get?a.get(this):cZ.propHooks._default.get(this)},run:function(a){var b,c=cZ.propHooks[this.prop];return this.options.duration?this.pos=b=p.easing[this.easing](a,this.options.duration*a,0,1,this.options.duration):this.pos=b=a,this.now=(this.end-this.start)*b+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),c&&c.set?c.set(this):cZ.propHooks._default.set(this),this}},cZ.prototype.init.prototype=cZ.prototype,cZ.propHooks={_default:{get:function(a){var b;return a.elem[a.prop]==null||!!a.elem.style&&a.elem.style[a.prop]!=null?(b=p.css(a.elem,a.prop,!1,""),!b||b==="auto"?0:b):a.elem[a.prop]},set:function(a){p.fx.step[a.prop]?p.fx.step[a.prop](a):a.elem.style&&(a.elem.style[p.cssProps[a.prop]]!=null||p.cssHooks[a.prop])?p.style(a.elem,a.prop,a.now+a.unit):a.elem[a.prop]=a.now}}},cZ.propHooks.scrollTop=cZ.propHooks.scrollLeft={set:function(a){a.elem.nodeType&&a.elem.parentNode&&(a.elem[a.prop]=a.now)}},p.each(["toggle","show","hide"],function(a,b){var c=p.fn[b];p.fn[b]=function(d,e,f){return d==null||typeof d=="boolean"||!a&&p.isFunction(d)&&p.isFunction(e)?c.apply(this,arguments):this.animate(c$(b,!0),d,e,f)}}),p.fn.extend({fadeTo:function(a,b,c,d){return this.filter(bZ).css("opacity",0).show().end().animate({opacity:b},a,c,d)},animate:function(a,b,c,d){var e=p.isEmptyObject(a),f=p.speed(b,c,d),g=function(){var b=cW(this,p.extend({},a),f);e&&b.stop(!0)};return e||f.queue===!1?this.each(g):this.queue(f.queue,g)},stop:function(a,c,d){var e=function(a){var b=a.stop;delete a.stop,b(d)};return typeof a!="string"&&(d=c,c=a,a=b),c&&a!==!1&&this.queue(a||"fx",[]),this.each(function(){var b=!0,c=a!=null&&a+"queueHooks",f=p.timers,g=p._data(this);if(c)g[c]&&g[c].stop&&e(g[c]);else for(c in g)g[c]&&g[c].stop&&cR.test(c)&&e(g[c]);for(c=f.length;c--;)f[c].elem===this&&(a==null||f[c].queue===a)&&(f[c].anim.stop(d),b=!1,f.splice(c,1));(b||!d)&&p.dequeue(this,a)})}}),p.each({slideDown:c$("show"),slideUp:c$("hide"),slideToggle:c$("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(a,b){p.fn[a]=function(a,c,d){return this.animate(b,a,c,d)}}),p.speed=function(a,b,c){var d=a&&typeof a=="object"?p.extend({},a):{complete:c||!c&&b||p.isFunction(a)&&a,duration:a,easing:c&&b||b&&!p.isFunction(b)&&b};d.duration=p.fx.off?0:typeof d.duration=="number"?d.duration:d.duration in p.fx.speeds?p.fx.speeds[d.duration]:p.fx.speeds._default;if(d.queue==null||d.queue===!0)d.queue="fx";return d.old=d.complete,d.complete=function(){p.isFunction(d.old)&&d.old.call(this),d.queue&&p.dequeue(this,d.queue)},d},p.easing={linear:function(a){return a},swing:function(a){return.5-Math.cos(a*Math.PI)/2}},p.timers=[],p.fx=cZ.prototype.init,p.fx.tick=function(){var a,b=p.timers,c=0;for(;c<b.length;c++)a=b[c],!a()&&b[c]===a&&b.splice(c--,1);b.length||p.fx.stop()},p.fx.timer=function(a){a()&&p.timers.push(a)&&!cO&&(cO=setInterval(p.fx.tick,p.fx.interval))},p.fx.interval=13,p.fx.stop=function(){clearInterval(cO),cO=null},p.fx.speeds={slow:600,fast:200,_default:400},p.fx.step={},p.expr&&p.expr.filters&&(p.expr.filters.animated=function(a){return p.grep(p.timers,function(b){return a===b.elem}).length});var c_=/^(?:body|html)$/i;p.fn.offset=function(a){if(arguments.length)return a===b?this:this.each(function(b){p.offset.setOffset(this,a,b)});var c,d,e,f,g,h,i,j={top:0,left:0},k=this[0],l=k&&k.ownerDocument;if(!l)return;return(d=l.body)===k?p.offset.bodyOffset(k):(c=l.documentElement,p.contains(c,k)?(typeof k.getBoundingClientRect!="undefined"&&(j=k.getBoundingClientRect()),e=da(l),f=c.clientTop||d.clientTop||0,g=c.clientLeft||d.clientLeft||0,h=e.pageYOffset||c.scrollTop,i=e.pageXOffset||c.scrollLeft,{top:j.top+h-f,left:j.left+i-g}):j)},p.offset={bodyOffset:function(a){var b=a.offsetTop,c=a.offsetLeft;return p.support.doesNotIncludeMarginInBodyOffset&&(b+=parseFloat(p.css(a,"marginTop"))||0,c+=parseFloat(p.css(a,"marginLeft"))||0),{top:b,left:c}},setOffset:function(a,b,c){var d=p.css(a,"position");d==="static"&&(a.style.position="relative");var e=p(a),f=e.offset(),g=p.css(a,"top"),h=p.css(a,"left"),i=(d==="absolute"||d==="fixed")&&p.inArray("auto",[g,h])>-1,j={},k={},l,m;i?(k=e.position(),l=k.top,m=k.left):(l=parseFloat(g)||0,m=parseFloat(h)||0),p.isFunction(b)&&(b=b.call(a,c,f)),b.top!=null&&(j.top=b.top-f.top+l),b.left!=null&&(j.left=b.left-f.left+m),"using"in b?b.using.call(a,j):e.css(j)}},p.fn.extend({position:function(){if(!this[0])return;var a=this[0],b=this.offsetParent(),c=this.offset(),d=c_.test(b[0].nodeName)?{top:0,left:0}:b.offset();return c.top-=parseFloat(p.css(a,"marginTop"))||0,c.left-=parseFloat(p.css(a,"marginLeft"))||0,d.top+=parseFloat(p.css(b[0],"borderTopWidth"))||0,d.left+=parseFloat(p.css(b[0],"borderLeftWidth"))||0,{top:c.top-d.top,left:c.left-d.left}},offsetParent:function(){return this.map(function(){var a=this.offsetParent||e.body;while(a&&!c_.test(a.nodeName)&&p.css(a,"position")==="static")a=a.offsetParent;return a||e.body})}}),p.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(a,c){var d=/Y/.test(c);p.fn[a]=function(e){return p.access(this,function(a,e,f){var g=da(a);if(f===b)return g?c in g?g[c]:g.document.documentElement[e]:a[e];g?g.scrollTo(d?p(g).scrollLeft():f,d?f:p(g).scrollTop()):a[e]=f},a,e,arguments.length,null)}}),p.each({Height:"height",Width:"width"},function(a,c){p.each({padding:"inner"+a,content:c,"":"outer"+a},function(d,e){p.fn[e]=function(e,f){var g=arguments.length&&(d||typeof e!="boolean"),h=d||(e===!0||f===!0?"margin":"border");return p.access(this,function(c,d,e){var f;return p.isWindow(c)?c.document.documentElement["client"+a]:c.nodeType===9?(f=c.documentElement,Math.max(c.body["scroll"+a],f["scroll"+a],c.body["offset"+a],f["offset"+a],f["client"+a])):e===b?p.css(c,d,e,h):p.style(c,d,e,h)},c,g?e:b,g,null)}})}),a.jQuery=a.$=p,typeof define=="function"&&define.amd&&define.amd.jQuery&&define("jquery",[],function(){return p})})(window);

},{}],14:[function(require,module,exports){
/*! Copyright (c) 2011 Brandon Aaron (http://brandonaaron.net)
 * Licensed under the MIT License (LICENSE.txt).
 *
 * Thanks to: http://adomas.org/javascript-mouse-wheel/ for some pointers.
 * Thanks to: Mathias Bank(http://www.mathias-bank.de) for a scope bug fix.
 * Thanks to: Seamus Leahy for adding deltaX and deltaY
 *
 * Version: 3.0.6
 * 
 * Requires: 1.2.2+
 */

(function($) {

var types = ['DOMMouseScroll', 'mousewheel'];

if ($.event.fixHooks) {
    for ( var i=types.length; i; ) {
        $.event.fixHooks[ types[--i] ] = $.event.mouseHooks;
    }
}

$.event.special.mousewheel = {
    setup: function() {
        if ( this.addEventListener ) {
            for ( var i=types.length; i; ) {
                this.addEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = handler;
        }
    },
    
    teardown: function() {
        if ( this.removeEventListener ) {
            for ( var i=types.length; i; ) {
                this.removeEventListener( types[--i], handler, false );
            }
        } else {
            this.onmousewheel = null;
        }
    }
};

$.fn.extend({
    mousewheel: function(fn) {
        return fn ? this.bind("mousewheel", fn) : this.trigger("mousewheel");
    },
    
    unmousewheel: function(fn) {
        return this.unbind("mousewheel", fn);
    }
});


function handler(event) {
    var orgEvent = event || window.event, args = [].slice.call( arguments, 1 ), delta = 0, returnValue = true, deltaX = 0, deltaY = 0;
    event = $.event.fix(orgEvent);
    event.type = "mousewheel";
    
    // Old school scrollwheel delta
    if ( orgEvent.wheelDelta ) { delta = orgEvent.wheelDelta/120; }
    if ( orgEvent.detail     ) { delta = -orgEvent.detail/3; }
    
    // New school multidimensional scroll (touchpads) deltas
    deltaY = delta;
    
    // Gecko
    if ( orgEvent.axis !== undefined && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
        deltaY = 0;
        deltaX = -1*delta;
    }
    
    // Webkit
    if ( orgEvent.wheelDeltaY !== undefined ) { deltaY = orgEvent.wheelDeltaY/120; }
    if ( orgEvent.wheelDeltaX !== undefined ) { deltaX = -1*orgEvent.wheelDeltaX/120; }
    
    // Add event and delta to the front of the arguments
    args.unshift(event, delta, deltaX, deltaY);
    
    return ($.event.dispatch || $.event.handle).apply(this, args);
}

})(jQuery);

},{}],15:[function(require,module,exports){
(function ($) {
    var defaults = {
        fullscreen : false,
        scale : false,
        defaultEventHandling : true,
        preopen : function () {},
        postopen : function () {},
        preclose : function () {},
        postclose : function () {},
        preresize : function () {},
        postresize : function () {}
    };

    var methods = {
        open : function () {
            var clone = this.clone(true),
                data = this.data("lightbox"),
                w, h;

            data.contents = clone;
            data.preopen.call(this);
            clone = data.contents; // data.contents might have been altered by data.preopen
            var cloneData = clone.data("lightbox");

            data.overlay = $("<div/>")
                .css({
                    "position"         : "fixed",
                    "left"             : "0px",
                    "top"              : "0px",
                    "height"           : "100%",
                    "min-height"       : "100%",
                    "width"            : "100%",
                    "z-index"          : "9999",
                    "background-color" : "black",
                    "opacity"          : "0.5"
                })
                .appendTo("body");

            data.box = $("<div/>")
                .css({
                    "position"         : "fixed",
                    "z-index"          : "9999"
                })
                .appendTo("body");
            

            data.box.append(clone);

            if (data.fullscreen === true) {
                w = window.innerWidth;
                h = window.innerHeight;
            } else {
                w = clone.width();
                h = clone.height();
                if (data.scale === true) {
                    var r = computeRatio(w, h);
                    w = parseInt(w * r, 10);
                    h = parseInt(h * r, 10);
                }
            }

            scaleElement(data.box, w, h);
            positionElement(data.box, w, h);

            scaleElement(clone, w, h);
            positionElement(clone, w, h);
            clone.css("position", "fixed")
                .css("z-index", 9999);

            data.box.append(
                $("<img src=\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAsCAYAAAAehFoBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NkY4OUE4QUE2MDEyMTFFMkFBMEM4Q0Y2RTlFNkI4QzEiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NkY4OUE4QUI2MDEyMTFFMkFBMEM4Q0Y2RTlFNkI4QzEiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo2Rjg5QThBODYwMTIxMUUyQUEwQzhDRjZFOUU2QjhDMSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo2Rjg5QThBOTYwMTIxMUUyQUEwQzhDRjZFOUU2QjhDMSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvXC/ukAAAcjSURBVHjaxFlpTFVXEJ7HDrIIUkCRzYitQJQK/kBTxAop2EQhaqkEqjZqK9FGa+2Cf2pabdIlEbE0FEkTArFaF6CAKCCStG5BokXAglpUIkKqgn0KyNb5jve+PB9vfyyTfIF7373nzJkzZ76ZuYqRkRGyUKwYoYwQxqsMD4aj9FsPo4Nxg1HP6LR0Mhsz37NlxDNSGLHt7e2e9+/fpwcPHtDTp0/p+fPn4iFHR0eaOnUqTZ8+nQICAsjV1bWJb5cwChiN5kysMNHCsNwHjE+uXr3qe+nSJWpsbCSlUmnUyzNmzKDw8HCKiooiX1/fGr61l1E9XgonMjLPnDnjX1NTI6xpiURGRtLSpUspJCSklC8/YvwzVgo7M7Lr6+vTzp49S9evX6exlISEBEpOTsYWfcgotFRhX0ZFeXl52JEjR2i8JDg4mJYtWwZXyeTLjxnD5ig8m1F17NixgJKSEhpvsbGxoZSUFIqNjf2VL1MZQ6Yo7M34o7CwcPapU6doImXdunUUFxf3E/+bbqzCCFm1x48fjzpx4gRNhmzYsAGWxkHM0hb0NeWrioqKKFaYsJjJwOnTp6HH94zXDSkczth59OjRSVMWYCKi3NxcO9blZ4a1PqbL5AdtwFa6ZM6cOWRvb09WVlakUChU95uamlQMpynu7u4gCvEOIEtnZyd1dHRofaeqqopmzZoVydHjfb7M1aZwDLNWdGVlpV7/6u3tpSVLlgjKtbW1Vd338vKSt/IlsbOzE8w2c+ZMcnNzU73z5MkTOnToEOkLq0xSCHdf8L+/MAY1Fd6JCYeHh/Uq3NbWRq2trbR8+XJhOdlisCDyiWvXrr30/Pz588VvgYGB5OnpSdbWL3Y4MzOT9O0k5NatW3ThwoUgXnASX/6m7sNeSGYuXrxolI9hu27fvi1cYsqUKeTs7CyUx+n28PBQPRcUFERz584VOYSPjw+SH/FsbW0tMXMaNde5c+eg33uahy6JrWszMDAgLGwM8vPz6d69e9Tf3y8GgOW8vb1py5Yt4ncoFhERIRQFkLlhgTdv3hSuYOw8V65cwfBvMVzUFY5paGgwehDg0aNHxCwo/g4ODr4I4OyfsOiKFSsE/Pz8hHVhWbgO/H///v0mzQMjstJw/DfUFV7U3Nxscvipq6sjJEQ4QLLvI4KsWrVKWBd+CxcB7UI4AtHdu3dNnufGDeT/FCUfOieGX1dXF5lTfRQXFwtLQkH4s+zXcuiTla2urhan3hzBIllekxUO5BsKQ9FBlzx79owKCgrI399fuAQUhT/L0QACIsjLyyNzyzEp9w6SXcIVk5riV5qAQkg/u7u7aWhoaFTcRgh7/Pix2eNL4c9VtrCdHB0sEQz68OFDcnFxIScnJ9V9BwcHsQhLxpcikb1s4X5spSUWBiEsXLhQe8LNPr1t2zaxCHPHl9ixV1a4B4fE3EQFPsv5K02bNk0A16PKFmY65LnmzoFdYvlPdok2PuVwPGtzti0mJkZECeQKYDv1w6ZKsNlCWBQSJLCkqYJYztIqW7gPSoOlTF15aGioinrhFnJic/LkSVH+I3vDc3ALMN369euRgZk8DwzC8rc6cZznctskv0J2tnjx4lHU29LSIths3759In729fW9yAE4JuOd9PR0k304LCwMQ/yprnD1ggULTBoEPQX4JqyLyCBT765du8TvUDY7O1tQN6KQXGjCMBs3bjR6HrgYk1K/psLFCQkJ/RjQmC2CssjEoCz8VmazrKwsEdrk5y5fviyYsKenRxWfcSgTExPF7hgzF56T2lu96gp3Q2kcDEMrRsWBrg2UxRbLUYHrQCoqKhr1PFgQOTLISfZnhLitW7eK7M7QfPHxaOFRvraa7rukpCSD4YWrWeGzaPBhYiiANHPPnj0630M6CRfRTEW3b9+udz704djCaBqWayuR6vjElyUnJ799+PBhreEFHUhUG6BgHC45hCEh1xcSkezn5OTQvHnzVIuEIIpgx6RsbJTAgKji1TtBmn2JYMZfK1eudNBVHE6UrF27lnbs2IFy403GiK4yH8H5y7S0tEkt87ETrKxSau2OGGpof7t69eoYpVIZj1M/0YLqBAWA1M1sMabzgxW9y6zUsGnTpgm1LCIOiIVD7F5drVd93UsfRiUn3mEHDx4cd8siTIK616xZ8wM6/Ob2h90ZRRw1oqG0oT6CuRIdHU0HDhyAIp/DJS3twMPPv2Z8mpGRoSgrKxszRUHnaAts3ry5C01L9Xg7Ft84FjF+ZEYLRzkk9QvMbl7jYO3evRvxNY+Rwfh3PL4i4ZC+w/iMc9vw0tJStJJEc8SQ4ECBuZA/p6amDkitp28YJn00UVjwYTFCau3HcYEZCqXv3LkjEh18BkNuDFYDBaM/wSyK5OU843cGqLRrIr7T6ZJXpK+hwdKXUDcwLwPBv11KvpulYsEiGSuFJ0z+F2AAyCap34M2ukUAAAAASUVORK5CYII=\" alt=\"close\"/>")
                    .css({
                        "position" : "absolute",
                        "right"    : "-9px",
                        "top"      : "-8px",
                        "width"    : "44px",
                        "height"   : "44px",
                        "z-index"  : "10000"
                    })
                    .click(function () {
                        clone.lightbox("close");
                    })
            );

            cloneData.contentWidth = w;
            cloneData.contentHeight = h;
            cloneData.opened = true;
            cloneData.resizeHandler = function () {
                clone.lightbox("resize");
            };

            $(window).on("resize", cloneData.resizeHandler);
            $(window).on("orientationchange", cloneData.resizeHandler);

            data.postopen.call(this);

            return this;
        },
                
        close : function () {
            var data = this.data("lightbox");

            data.preclose.call(this);

            $(window).off("resize", data.resizeHandler);
            $(window).off("orientationchange", data.resizeHandler);

            data.opened = false;
            data.overlay.remove();
            data.overlay = undefined;

            data.postclose.call(this);

            data.box.remove();
            return this;
        },
                
        resize : function () {
            var data = this.data("lightbox"),
                w, h;

            data.preresize.call(this);

            if (data.fullscreen === true) {
                w = window.innerWidth;
                h = window.innerHeight;
            } else {
                w = data.contentWidth;
                h = data.contentHeight;
                if (data.scale === true) {
                    var r = computeRatio(w, h);
                    w = parseInt(w * r, 10);
                    h = parseInt(h * r, 10);
                }
            }

            scaleElement(data.box, w, h);
            positionElement(data.box, w, h);

            scaleElement(data.contents, w, h);
            positionElement(data.contents, w, h);

            data.contentWidth = w;
            data.contentHeight = h;

            data.postresize.call(this);

            return this;
        },

        toggle : function () {
            if (this.data("lightbox").opened === true) {
                this.lightbox("close");
            } else {
                this.lightbox("open");
            }
            return this;
        },

        init : function (options) {
            return this.each(function() {
                var $this = $(this),
                data = $this.data("lightbox");
                if ( !data ) {
                    var settings = $.extend(defaults, options, { opened : false });
                    $this.data("lightbox", settings);
                }

                if ($this.data("lightbox").defaultEventHandling === true) {
                    // modified from ecmanaut's answer at
                    // http://stackoverflow.com/questions/3103842/safari-ipad-prevent-zoom-on-double-tap
                    $this.on("touchstart", function (e) {
                        var t2 = e.timeStamp,
                            t1 = $this.data("lightbox").lastTouch || t2,
                            dt = t2 - t1,
                            fingers = e.originalEvent.touches.length;
                        $this.data("lightbox").lastTouch = t2;
                        if (!dt || dt > 500 || fingers > 1) {
                            return;
                        }
                        e.preventDefault(); // double tap - prevent the zoom
                        $this.lightbox("toggle");
                    });
                }

                return this;
            });
        }
    };

    $.fn.lightbox = function (method) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === "object" || !method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( "Method " +  method + " does not exist on jQuery.lightbox" );
            return null;
        }
    };

    var computeRatio = function (originalWidth, originalHeight) {
        var wr = (originalWidth > 0) ? window.innerWidth / originalWidth : 1,
            hr = (originalHeight > 0) ? window.innerHeight / originalHeight : 1,
            r = Math.min(wr, hr);
        return r;
    };

    var scaleElement = function (elem, width, height) {
        elem.css("width", width + "px")
            .css("height", height + "px");
    };

    var positionElement = function (elem, width, height) {
        var left = (window.innerWidth  - width) / 2,
            top = (window.innerHeight - height) / 2;
        if (left < 0) {
            left = 0;
        }
        if (top < 0) {
            top = 0;
        }

        elem.css("left", left + "px")
            .css("top", top + "px");
    };

}(jQuery));

},{}],16:[function(require,module,exports){
(function() {
    "use strict";

    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
 
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

},{}],17:[function(require,module,exports){
/**
sprintf() for JavaScript 0.7-beta1
http://www.diveintojavascript.com/projects/javascript-sprintf

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2010.11.07 - 0.7-beta1-node
  - converted it to a node.js compatible module

2010.09.06 - 0.7-beta1
  - features: vsprintf, support for named placeholders
  - enhancements: format cache, reduced global namespace pollution

2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.

2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license

2007.10.21 - 0.4:
 - unit test and patch (David Baird)

2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)

2007.09.11 - 0.2:
 - feature: added argument swapping

2007.04.03 - 0.1:
 - initial release
**/

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	// convert object to simple one line string without indentation or
	// newlines. Note that this implementation does not print array
	// values to their actual place for sparse arrays. 
	//
	// For example sparse array like this
	//    l = []
	//    l[4] = 1
	// Would be printed as "[1]" instead of "[, , , , 1]"
	// 
	// If argument 'seen' is not null and array the function will check for 
	// circular object references from argument.
	str_format.object_stringify = function(obj, depth, maxdepth, seen) {
		var str = '';
		if (obj != null) {
			switch( typeof(obj) ) {
			case 'function': 
				return '[Function' + (obj.name ? ': '+obj.name : '') + ']';
			    break;
			case 'object':
				if ( obj instanceof Error) { return '[' + obj.toString() + ']' };
				if (depth >= maxdepth) return '[Object]'
				if (seen) {
					// add object to seen list
					seen = seen.slice(0)
					seen.push(obj);
				}
				if (obj.length != null) { //array
					str += '[';
					var arr = []
					for (var i in obj) {
						if (seen && seen.indexOf(obj[i]) >= 0) arr.push('[Circular]');
						else arr.push(str_format.object_stringify(obj[i], depth+1, maxdepth, seen));
					}
					str += arr.join(', ') + ']';
				} else if ('getMonth' in obj) { // date
					return 'Date(' + obj + ')';
				} else { // object
					str += '{';
					var arr = []
					for (var k in obj) { 
						if(obj.hasOwnProperty(k)) {
							if (seen && seen.indexOf(obj[k]) >= 0) arr.push(k + ': [Circular]');
							else arr.push(k +': ' +str_format.object_stringify(obj[k], depth+1, maxdepth, seen)); 
						}
					}
					str += arr.join(', ') + '}';
				}
				return str;
				break;
			case 'string':				
				return '"' + obj + '"';
				break
			}
		}
		return '' + obj;
	}

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw new Error(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^sO]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw new Error(sprintf('[sprintf] expecting number but found %s "' + arg + '"', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
				    case 'O': arg = str_format.object_stringify(arg, 0, parseInt(match[7]) || 5); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosOuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw new Error('[sprintf] ' + replacement_field);
							}
						}
					}
					else {
                        throw new Error('[sprintf] ' + replacement_field);
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw new Error('[sprintf] ' + _fmt);
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

var vsprintf = function(fmt, argv) {
	var argvClone = argv.slice();
	argvClone.unshift(fmt);
	return sprintf.apply(null, argvClone);
};

module.exports = sprintf;
sprintf.sprintf = sprintf;
sprintf.vsprintf = vsprintf;

},{}],18:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Data = require('./data.js'),
    DataValue = require('./data_value.js');

/**
 * @class ArrayData
 * @for ArrayData
 * @constructor
 * @param {array} columns A array of DataVariables
 * @param {array} stringArray A array of strings which will later be parsed into DataValues
 */
var ArrayData = new jermaine.Model(function () {
    var ArrayData = this; // huh?  This shadows the ArrayData defined on the previous line.
    //                       Is that intended/correct?  Probably, but need to check for sure.
    //                       mbp Wed Feb 25 18:31:15 2015

    this.isA(Data);
    this.hasAn("array");
    this.hasA("stringArray");
    this.isBuiltWith("columns", "stringArray", function () {
        this.init();
        this.addListener("listenerAdded", function (event) {
            if (event.targetType === "dataReady") {
                var data = this.array();
                event.listener(data[0][0], data[data.length-1][0]);
            }
        });
    });

    /**
     * 
     *
     * @method getIterator
     * @param {string array} columnIDs
     * @param {DataValue} min
     * @param {DataValue} max
     * @param {Integer} buffer
     * @author jrfrimme
     */
    this.respondsTo("getIterator", function (columnIds, min, max, buffer) {
        return ArrayData.getArrayDataIterator(this, columnIds, min, max, buffer);
    });

    /**
     * Determines the upper and lower bounds of a column in a dataset.
     *
     * @method getBounds
     * @param {Integer} columnNumber Column in the dataset to have its bounds determined.
     * @return {array} Array in the form: [lowerBound, upperBound].
     * @author jrfrimme
     */
    this.respondsTo("getBounds", function (columnNumber) {
        var data = this.array(),
            min = data[0][columnNumber],
            max = min,
            i;

        for (i = 1; i < data.length; i++) {
            if (data[i][columnNumber] < min) {
                min = data[i][columnNumber];
            }
            if (data[i][columnNumber] > max) {
                max = data[i][columnNumber];
            }
        }

        return [min, max];
    });

    /**
     * @method onReady
     * @param callback
     */

    /**
     * @method getArrayDataIterator
     * @static
     * @param {ArrayData} arrayData
     * @param {string array} columnIDs
     * @param {DataValue} min
     * @param {DataValue} max
     * @param {Integer} buffer
     * @return iter
     * @author jrfrimme
     */
    ArrayData.getArrayDataIterator = function (arrayData, columnIds, min, max, buffer) {

        var i, j,
            firstIndex, lastIndex,
            currentIndex,
            columnIndices,
            array = arrayData.array();

        buffer = buffer || 0;

        // columnIds argument should be an array of strings
        if (Object.prototype.toString.apply(columnIds) !== "[object Array]") {
            throw new Error("ArrayData: getIterator method requires that the first parameter be an array of strings");
        } else {
            for (i = 0; i < columnIds.length; ++i) {
                if (typeof(columnIds[i]) !== "string") {
                    throw new Error("ArrayData: getIterator method requires that the first parameter be an array of strings");
                }
            }
        }

        //min,max arguments should be data values
        if (!DataValue.isInstance(min) || !DataValue.isInstance(max)) {
            throw new Error("ArrayData: getIterator method requires the second and third argument to be number values");
        }

        //buffer argument should be an integer
        if (typeof(buffer) !== "number") {
            throw new Error("ArrayData: getIterator method requires last argument to be an integer");
        }

        // if we have no data, return an empty iterator
        if (array.length === 0) {
            return {
                "next"    : function () {},
                "hasNext" : function () { return false; }
            };
        }

        // find the index of the first row in the array whose column0 value is >= min
        for (firstIndex = 0; firstIndex < array.length; ++firstIndex) {
            if (array[firstIndex][0].ge(min)) {
                break;
            }
        }
        // back up 'buffer' steps
        firstIndex = firstIndex - buffer;
        if (firstIndex < 0) {
            firstIndex = 0;
        }
        
        // find the index of the last row in the array whose column0 value is <= max
        if (firstIndex === array.length-1) {
            lastIndex = firstIndex;
        } else {
            for (lastIndex = firstIndex; lastIndex < array.length-1; ++lastIndex) {
                if (array[lastIndex+1][0].gt(max)) {
                    break;
                }
            }
        }
        // move forward 'buffer' steps
        lastIndex = lastIndex + buffer;
        if (lastIndex > array.length-1) {
            lastIndex = array.length-1;
        }

        columnIndices = [];
        for (j = 0; j < columnIds.length; ++j) {
            var k = arrayData.columnIdToColumnNumber(columnIds[j]);
            columnIndices.push( k );
        }

        currentIndex = firstIndex;
        
        return {
            next : function () {
                var projection = [],
                    i;
                if (currentIndex > lastIndex) {
                    return null;
                }
                for (i = 0; i < columnIndices.length; ++i) {
                    projection.push(array[currentIndex][columnIndices[i]]);
                }
                ++currentIndex;
                return projection;
            },
            hasNext : function () {
                return currentIndex <= lastIndex;
            }
        };
    };

    /**
     * @method textToDataValuesArray
     * @static
     * @param {array} dataVariableArray
     * @param {string} text
     * @return {array} dataValues
     * @author jrfrimme
     * @todo If the number of comma-separated values on the current line is not the same as the number of columns in the metadata, should throw an error.
     */
    ArrayData.textToDataValuesArray = function (dataVariableArray, text) {
        //IMPORTANT NOTE: dataVariableArray is a plain javascript array of DataVariable instances; it
        //is NOT a jermaine attr_list.
        var dataValues = [],
            lines = text.split("\n"),
            i;
        for (i = 0; i < lines.length; ++i) {
            if (/\d/.test(lines[i])) { // skip line unless it contains a digit
                var stringValuesThisRow = lines[i].split(/\s*,\s*/),
                    dataValuesThisRow = [],
                    j;
                if (stringValuesThisRow.length === dataVariableArray.length) {
                    for (j = 0; j < stringValuesThisRow.length; ++j) {
                        dataValuesThisRow.push(DataValue.parse(dataVariableArray[j].type(), stringValuesThisRow[j]));
                    }
                    dataValues.push( dataValuesThisRow );
                    //} else {
                    // we get here if the number of comma-separated values on the current line
                    // (lines[i]) is not the same as the number of columns in the metadata.  This
                    // should probably throw an error, or something like that.  For now, though, we
                    // just ignore it.
                    //console.log('bad line: ' + lines[i]);
                }
            }
        }
        return dataValues;
    };

    /**
     * @method textToStringArray
     * @static
     * @param {string} text 
     * @return {array} stringValues
     * @author jrfrimme
     */
    ArrayData.textToStringArray = function (dataVariables, text) {
        var stringValues = [],
            lines = text.split("\n"),
            stringValuesThisRow,
            numColumns,
            i;

        // clean up each line
        for (i = 0; i < lines.length; ++i) {
            lines[i] = lines[i]
                .replace(/^\s+/,     "")   // remove leading whitespace
                .replace(/\s+$/,     "")   // remove trailing whitespace
                .replace(/\s*,\s*/g, ",")  // remove any whitespace next to commas
                .replace(/\s+/g,     ","); // replace any remaining whitespace runs with a comma
            // now line consists of comma-separated values, with no whitespace
        }

        for (i = 0; i < lines.length; ++i) {
            if (/\d/.test(lines[i])) { // skip line unless it contains a digit
                numColumns = lines[i].split(/,/).length;
                break;
            }
        }

        for (i = 0; i < lines.length; ++i) {
            if (/\d/.test(lines[i])) { // skip line unless it contains a digit
                stringValuesThisRow = lines[i].split(/,/);
                if (stringValuesThisRow.length === numColumns) {
                    stringValues.push( stringValuesThisRow );
                } else {
                    throw new Error("Data Parsing Error: The line '" + lines[i] + "' has " + stringValuesThisRow.length + " data columns when it requires " + numColumns + " columns");
                }
            }
        }
        return stringValues;
    };

    /**
     * Parses an array of strings into an array of DataValues.
     * 
     * @method textToStringArray
     * @static
     * @param {array} dataVariableArray plain javascript array of DataVariables
     * @param {array} stringArray plain javascript array of strings
     * @return {array} plain javascript array of DataValue instances
     * @author jrfrimme
     */
    ArrayData.stringArrayToDataValuesArray = function (dataVariableArray, stringArray) {
        //IMPORTANT NOTE: dataVariableArray is a plain javascript array of DataVariable instances; it
        //is NOT a jermaine attr_list.

        var dataValues = [],
            dataValuesThisRow,
            i,
            j;

        for (i = 0; i < stringArray.length; ++i) {
            dataValuesThisRow = [];
            for (j = 0; j < stringArray[i].length; ++j) {
                dataValuesThisRow.push(DataValue.parse(dataVariableArray[j].type(), stringArray[i][j]));
            }
            dataValues.push( dataValuesThisRow );
        }
        return dataValues;
    };

});

module.exports = ArrayData;


},{"../../lib/jermaine/src/jermaine.js":9,"./data.js":25,"./data_value.js":29}],19:[function(require,module,exports){
//var jermaine = require('../../lib/jermaine/src/jermaine.js');
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.horizontalaxis),
    Displacement = require('../math/displacement.js'),
    Point = require('../math/point.js'),
    DataMeasure = require('../core/data_measure.js'),
    RGBColor = require('../math/rgb_color.js'),
    Enum = require('../math/enum.js'),
    EventEmitter = require('./event_emitter.js'),
    Text = require('../core/text.js'),
    AxisBinding = require('./axis_binding.js'),
    AxisTitle = require('./axis_title.js'),
    DataValue = require('./data_value.js'),
    Grid = require('./grid.js'),
    Labeler = require('./labeler.js'),
    Pan = require('./pan.js'),
    Zoom = require('./zoom.js'),

    Util = require('../math/util.js'),

    Orientation = new Enum("AxisOrientation");

var Axis = new jermaine.Model("Axis", function () {

    this.isA(EventEmitter);

    this.hasA("title").which.validatesWith(function (title) {
        return title instanceof AxisTitle;
    });
    this.hasMany("labelers").eachOfWhich.validateWith(function (labelers) {
        return labelers instanceof Labeler;
    });
    this.hasA("grid").which.validatesWith(function (grid) {
        return grid instanceof Grid;
    });
    this.hasA("pan").which.validatesWith(function (pan) {
        return pan instanceof Pan;
    });
    this.hasA("zoom").which.validatesWith(function (zoom) {
        return zoom instanceof Zoom;
    });
    this.hasA("binding").which.validatesWith(function (binding) {
        return binding === null || binding instanceof AxisBinding;
    });
    this.hasAn("id").which.isA("string");
    this.hasA("type").which.isOneOf(DataValue.types());
    this.hasA("length").which.validatesWith(function (length) {
        return length instanceof Displacement;
    });
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });
    this.hasA("pregap").which.isA("number");
    this.hasA("postgap").which.isA("number");
    this.hasAn("anchor").which.isA("number");
    this.hasA("base").which.validatesWith(function (base) {
        return base instanceof Point;
    });

    /**
     * Stores the "min" value from the mugl file as a string, if there was one.
     *
     * @property min
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("min").which.isA("string");

    /**
     * The current min DataValue for the axis.
     *
     * @property dataMin
     * @type {DataValue}
     * @author jrfrimme
     */
    this.hasA("dataMin").which.validatesWith(DataValue.isInstance);
    /**
     * Convenience method for checking to see if dataMin has been set or not
     *
     * @method hasDataMin
     * @author jrfrimme
     * @return {Boolean}
     */
    this.respondsTo("hasDataMin", function () {
        return this.dataMin() !== undefined;
    });

    
    this.hasA("minoffset").which.isA("number");
    this.hasA("minposition").which.validatesWith(function (minposition) {
        return minposition instanceof Displacement;
    });

    /**
     * Stores the "max" value from the mugl file as a string, if there was one.
     *
     * @property max
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("max").which.isA("string");

    /**
     * The current max DataValue for the axis.
     *
     * @property dataMax
     * @type {DataValue}
     * @author jrfrimme
     */
    this.hasA("dataMax").which.validatesWith(DataValue.isInstance);
    /**
     * Convenience method for checking to see if dataMax has been set or not.
     *
     * @method hasDataMax
     * @author jrfrimme
     * @return {Boolean}
     */
    this.respondsTo("hasDataMax", function () {
        return this.dataMax() !== undefined;
    });



    this.hasA("maxoffset").which.isA("number");
    this.hasA("maxposition").which.validatesWith(function (maxposition) {
        return maxposition instanceof Displacement;
    });


    this.hasA("positionbase").which.isA("string"); // deprecated
    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    });
    this.hasA("tickcolor").which.validatesWith(function (color) {
        return color === null || color instanceof RGBColor;
    });
    this.hasA("tickwidth").which.isA("integer");
    this.hasA("tickmin").which.isA("integer");
    this.hasA("tickmax").which.isA("integer");
    this.hasA("highlightstyle").which.validatesWith(function (highlightstyle) {
        return typeof(highlightstyle) === "string";
    });
    this.hasA("linewidth").which.isA("integer");
    this.hasA("orientation").which.validatesWith(Orientation.isInstance);
    this.isBuiltWith("orientation", function () {
        this.grid(new Grid());
        this.zoom(new Zoom());
        this.pan(new Pan());
    });

    this.hasA("pixelLength").which.isA("number");
    this.hasA("parallelOffset").which.isA("number");
    this.hasA("perpOffset").which.isA("number");

    this.hasA("axisToDataRatio").which.isA("number");

    this.respondsTo("initializeGeometry", function (graph, graphicsContext) {
        var plotBox = graph.plotBox(),
            position = this.position(),
            base     = this.base(),
            pixelLength,
            i;
        if (this.orientation() === Axis.HORIZONTAL) {
            pixelLength = this.length().calculateLength( plotBox.width() );
            this.pixelLength(pixelLength);
            this.parallelOffset( position.x() + (base.x() + 1) * plotBox.width()/2 - (this.anchor() + 1) * pixelLength / 2 );
            this.perpOffset( position.y() + (base.y() + 1) * plotBox.height() / 2 );
        } else {
            pixelLength = this.length().calculateLength( plotBox.height() );
            this.pixelLength(pixelLength);
            this.parallelOffset( position.y() + (base.y() + 1) * plotBox.height()/2 - (this.anchor() + 1) * pixelLength / 2 );
            this.perpOffset( position.x() + (base.x() + 1) * plotBox.width() / 2 );
        }
        this.minoffset(this.minposition().calculateCoordinate(pixelLength));
        this.maxoffset(pixelLength - this.maxposition().calculateCoordinate(pixelLength));
        if (this.hasDataMin() && this.hasDataMax()) {
            this.computeAxisToDataRatio();
        }
        for (i = 0; i < this.labelers().size(); ++i) {
            this.labelers().at(i).initializeGeometry(graph);
        }
        if (this.title()) {
            this.title().initializeGeometry(graph, graphicsContext);
        }
    });

    this.respondsTo("computeAxisToDataRatio", function () {
        if (this.hasDataMin() && this.hasDataMax()) {
            this.axisToDataRatio((this.pixelLength() - this.maxoffset() - this.minoffset()) / (this.dataMax().getRealValue() - this.dataMin().getRealValue()));
        }
    });

    this.respondsTo("dataValueToAxisValue", function (v) {
        return this.axisToDataRatio() * ( v.getRealValue() - this.dataMin().getRealValue() ) + this.minoffset() + this.parallelOffset();
    });

    this.respondsTo("axisValueToDataValue", function (a) {
        return DataValue.create( this.type(),
                                 ( this.dataMin().getRealValue() +
                                   ( a - this.minoffset() - this.parallelOffset() ) / this.axisToDataRatio()) );
    });

    this.hasA("currentLabeler").which.validatesWith(function (labeler) {
        return labeler===null || labeler instanceof Labeler;
    });
    this.hasA("currentLabelDensity").which.isA("number");
    this.hasA("currentLabelerIndex").which.isA("number");

    /**
     * Decides which labeler to use: take the one with the largest density <= 0.8.
     * Unless all have density > 0.8, in which case we take the first one.  This assumes
     * that the labelers list is ordered in increasing order of label density.
     * This function sets the `currentLabeler` and `currentLabelDensity` attributes.
     *
     * @method prepareRender
     * @param {Object} graphicsContext
     * @author jrfrimme
     */
    this.respondsTo("prepareRender", function (graphicsContext) {
        if (!this.hasDataMin() || !this.hasDataMax()) {
            // if either endpoint dataMin() or dataMax() hasn't been specified yet,
            // return immediately without doing anything
            return;
        }
        var currentLabeler,
            currentLabelDensity = 0,
            storedDensity = 0,
            densityThreshold = 0.8,
            labelers  = this.labelers(),
            nlabelers = labelers.size(),
            index     = this.currentLabelerIndex(),
            storedIndex;

        if (nlabelers <= 0) {
            currentLabeler = null;
        } else {
            var flag = true,
                lastLabelerIndex = labelers.size() - 1;

            if (index === undefined) {
                index = 0;
            }
            storedIndex = index;
            currentLabelDensity = labelers.at(index).getLabelDensity(graphicsContext);

            if (currentLabelDensity > densityThreshold) {
                if (index === 0) { // use labeler at position 0
                    flag = false;
                } else { // check the prior labeler
                    storedDensity = currentLabelDensity;
                    index--;
                }
            } else if (currentLabelDensity < densityThreshold) { // check the next labeler
                storedDensity = currentLabelDensity;
                if (index === lastLabelerIndex) {
                    flag = false;
                } else {
                    index++;
                }
            } else if (currentLabelDensity === densityThreshold) { // use labeler at position 0
                flag = false;
            }

            while (flag) {
                currentLabelDensity = labelers.at(index).getLabelDensity(graphicsContext);
                if (currentLabelDensity > densityThreshold) { // labeler before current one
                    if (index === 0) { // use labeler at position 0
                        break;
                    } else if (storedIndex > index) { // going backwards through labelers
                        storedIndex = index;
                        storedDensity = currentLabelDensity;
                        index--;
                    } else { // the prior labeler had density < threshold and was checking the next labeler
                        index = storedIndex;
                        currentLabelDensity = storedDensity;
                        break;
                    }
                } else if (currentLabelDensity < densityThreshold) { // this labeler or one after it
                    if (storedIndex > index) { // going backwards through labelers so prior labeler had density > threshold
                        break;
                    } else if (index === lastLabelerIndex) {
                        break;
                    } else { // check next labeler to see if it has density < threshold
                        storedIndex = index;
                        storedDensity = currentLabelDensity;
                        index++;
                    }
                } else if (currentLabelDensity === densityThreshold) {
                    break;
                }
            }
        }
        currentLabeler = labelers.at(index);

        this.currentLabeler(currentLabeler);
        this.currentLabelerIndex(index);
        this.currentLabelDensity(currentLabelDensity);
    });

    this.respondsTo("toRealValue", function (value) {
        if (typeof(value) === "number") {
            return value;
        } else if (DataValue.isInstance(value)) {
            return value.getRealValue();
        } else {
            throw new Error("unknown value type for axis value " + value);
        }
    });

    this.respondsTo("toDataValue", function (value) {
        if (typeof(value) === "number") {
            return DataValue.create(this.type(), value);
        } else if (DataValue.isInstance(value)) {
            return value;
        } else {
            throw new Error("unknown value type for axis value " + value);
        }
    });

    this.respondsTo("setDataRangeNoBind", function(min, max, dispatch) {

        // NOTE: min and max may either be plain numbers, or
        // DataValue instances.  If they're plain numbers, they
        // get converted to DataValue instances here before being
        // passed to the dataMin()/dataMax() setters below.

        var dataValueMin = this.toDataValue(min),
            dataValueMax = this.toDataValue(max);

        this.dataMin(dataValueMin);
        this.dataMax(dataValueMax);
        // if (_graph != null) { _graph.invalidateDisplayList(); }
        if (dispatch === undefined) {
            dispatch = true;
        }

        this.emit({'type' : 'dataRangeSet',
                   'min'  : dataValueMin,
                   'max'  : dataValueMax});
        /*
         if (dispatch) {
         //dispatchEvent(new AxisEvent(AxisEvent.CHANGE,min,max));  
         }
         */
    });

    this.respondsTo("setDataRange", function (min, max, dispatch) {
        if (this.binding()) {
            this.binding().setDataRange(this, min, max, dispatch);
        } else {
            this.setDataRangeNoBind(min, max, dispatch);
        }
    });

    this.respondsTo("doPan", function (pixelBase, pixelDisplacement) {
        var pan = this.pan(),
            panMin = pan.min(),
            panMax = pan.max(),
            offset,
            newRealMin,
            newRealMax;

        if (!pan.allowed()) { return; }
        offset = pixelDisplacement / this.axisToDataRatio();
        newRealMin = this.dataMin().getRealValue() - offset;
        newRealMax = this.dataMax().getRealValue() - offset;
        
        if (panMin && newRealMin < panMin.getRealValue()) {
            newRealMax += (panMin.getRealValue() - newRealMin);
            newRealMin = panMin.getRealValue();
        }
        if (panMax && newRealMax > panMax.getRealValue()) {
            newRealMin -= (newRealMax - panMax.getRealValue());
            newRealMax = panMax.getRealValue();
        }
        this.setDataRange(DataValue.create(this.type(), newRealMin),
                          DataValue.create(this.type(), newRealMax));
    });

    this.respondsTo("doZoom", function (pixelBase, pixelDisplacement) {
        var zoom = this.zoom(),
            pan  = this.pan(),
            type = this.type(),
            dataMin = this.dataMin(),
            dataMax = this.dataMax(),
            panMin  = pan.min(),
            panMax  = pan.max(),
            zoomMin = zoom.min(),
            zoomMax = zoom.max(),
            baseRealValue,
            factor,
            newMin,
            newMax,
            d;
        if (!zoom.allowed()) {
            return;
        }
        baseRealValue = this.axisValueToDataValue(pixelBase).getRealValue();
        if (DataValue.isInstance(zoom.anchor())) {
            baseRealValue = zoom.anchor().getRealValue();
        }
        factor = 10 * Math.abs(pixelDisplacement / (this.pixelLength() - this.maxoffset() - this.minoffset()));
        /*TODO: uncomment after this.reversed() has been implemented
         if (this.reversed()) { factor = -factor; }
         */
        if (pixelDisplacement <= 0) {
            newMin = DataValue.create(type,
                                      (dataMin.getRealValue() - baseRealValue) * ( 1 + factor ) + baseRealValue);
            newMax = DataValue.create(type,
                                      (dataMax.getRealValue() - baseRealValue) * ( 1 + factor ) + baseRealValue);
        } else {
            newMin = DataValue.create(type,
                                      (dataMin.getRealValue() - baseRealValue) * ( 1 - factor ) + baseRealValue);
            newMax = DataValue.create(type,
                                      (dataMax.getRealValue() - baseRealValue) * ( 1 - factor ) + baseRealValue);
        }
        if (panMin && newMin.lt(panMin)) {
            newMin = panMin;
        }
        if (panMax && newMax.gt(panMax)) {
            newMax = panMax;
        }
        
        if ((dataMin.le(dataMax) && newMin.lt(newMax)) ||
            (dataMin.ge(dataMax) && newMin.gt(newMax))) {
            if (zoomMax && (newMax.gt(newMin.add(zoomMax)))) {
                d = (newMax.getRealValue() - newMin.getRealValue() - zoomMax.getRealValue()) / 2;
                newMax = newMax.addRealValue(-d);
                newMin = newMin.addRealValue(d);
            } else if (zoomMin && (newMax.lt(newMin.add(zoomMin)))) {
                d = (zoomMin.getRealValue() - (newMax.getRealValue() - newMin.getRealValue())) / 2;
                newMax = newMax.addRealValue(d);
                newMin = newMin.addRealValue(-d);
            }
            this.setDataRange(newMin, newMax);
        }
    });

    /**
     * Compute the distance from an axis to a point.  The point
     * (x,y) is expressed in pixel coordinates in the same
     * coordinate system as the axis.
     * 
     * We use two different kinds of computations depending on
     * whether the point lies inside or outside the region bounded
     * by the two lines perpendicular to the axis through its
     * endpoints.  If the point lies inside this region, the
     * distance is simply the difference in the perpendicular
     * coordinate of the point and the perpendicular coordinate of
     * the axis.
     * 
     * If the point lies outside the region, then the distance is
     * the L2 distance between the point and the closest endpoint
     * of the axis.
     *
     * @method distanceToPoint
     * @param {} x
     * @param {} y
     * @author jrfrimme
     */
    this.respondsTo("distanceToPoint", function (x, y) {
        var perpCoord     = (this.orientation() === Axis.HORIZONTAL) ? y : x,
            parallelCoord = (this.orientation() === Axis.HORIZONTAL) ? x : y,
            parallelOffset = this.parallelOffset(),
            perpOffset     = this.perpOffset(),
            pixelLength    = this.pixelLength(),
            l2dist         = Util.l2dist;

        if (parallelCoord < parallelOffset) {
            // point is under or left of the axis; return L2 distance to bottom or left axis endpoint
            return l2dist(parallelCoord, perpCoord, parallelOffset, perpOffset);
        }
        if (parallelCoord > parallelOffset + pixelLength) {
            // point is above or right of the axis; return L2 distance to top or right axis endpoint
            return l2dist(parallelCoord, perpCoord, parallelOffset + pixelLength, perpOffset);
        }
        // point is between the axis endpoints; return difference in perpendicular coords
        return Math.abs(perpCoord - perpOffset);
    });


    this.respondsTo("normalize", function (graph) {
        var i,
            title,
            label;

        //
        // Handles title tags
        //
        if (this.title() && this.title().content() === undefined) {
            this.title().content(new Text(this.id()));
        }

        //
        // Handles missing labelers
        //
        if (this.labelers().size() === 0) {
            var defaultValues = (utilityFunctions.getDefaultValuesFromXSD()).horizontalaxis.labels,
                spacingString = this.type() === DataValue.NUMBER ?
                    defaultValues.defaultNumberSpacing :
                    defaultValues.defaultDatetimeSpacing,
                spacingStrings = spacingString.split(/\s+/);

            for (i = 0; i < spacingStrings.length; i++) {
                label = new Labeler(this);
                label.spacing(DataMeasure.parse(this.type(), spacingStrings[i]));
                this.labelers().add(label);
            }
        }

        //
        // normalizes the labelers
        //
        for (i = 0; i < this.labelers().size(); i++) {
            this.labelers().at(i).normalize();
        }

    });

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis, attributes);
});

Axis.HORIZONTAL = new Orientation("horizontal");
Axis.VERTICAL   = new Orientation("vertical");

Axis.Orientation = Orientation;

module.exports = Axis;

},{"../../lib/jermaine/src/jermaine.js":9,"../core/data_measure.js":27,"../core/text.js":63,"../math/displacement.js":100,"../math/enum.js":101,"../math/point.js":103,"../math/rgb_color.js":104,"../math/util.js":105,"../util/utilityFunctions.js":132,"./axis_binding.js":20,"./axis_title.js":21,"./data_value.js":29,"./event_emitter.js":37,"./grid.js":41,"./labeler.js":44,"./pan.js":51,"./zoom.js":70}],20:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var AxisBinding = new jermaine.Model("AxisBinding", function () {
    var AxisBinding = this;
    
    AxisBinding.instances = {};

    /**
     * 
     *
     * @property id
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("id").which.isA("string");

    /**
     * 
     *
     * @property axes
     * @type {Array}
     * @author jrfrimme
     */
    this.hasA("axes"); // js array

    this.isBuiltWith("id", function() {
        AxisBinding.instances[this.id()] = this;
        this.axes([]);
    });

    /**
     * 
     *
     * @method addAxis
     * @param {Axis} axis
     * @param {number|DataValue} min
     * @param {number|DataValue} max
     * @author jrfrimme
     */
    this.respondsTo("addAxis", function(axis, min, max, multigraph/*optional*/) {
        // NOTE: min/max can be either numbers, or DataValue
        // instances, but they CANNOT be strings.

        if (axis.binding()) {
            axis.binding().removeAxis(axis);
        }
        axis.binding(this);

        // convert min/max to numbers
        min = axis.toRealValue(min);
        max = axis.toRealValue(max);

        this.axes().push({
            axis       : axis,
            multigraph : multigraph,
            factor     : 1 / (max - min),
            offset     : -min / (max - min),
            min        : min,
            max        : max
        });
    });

    /**
     * 
     *
     * @method removeAxis
     * @param {Axis} axis
     * @author jrfrimme
     */
    this.respondsTo("removeAxis", function(axis) {
        var axes = this.axes(),
            i;
        for (i=0; i<axes.length(); ++i) {
            if (axes[i].axis === axis) {
                axes.splice(i,1);
                break;
            }
        }
    });

    /**
     * Force all the axes in this binding to sync up with each
     * other, if possible.
     * 
     * This is done by looking for an axis in this binding which
     * has its dataMin and dataMax values set, and then calling
     * its setDataRange() method with those values.  The main
     * purpose of this method is to facilitate the initial setting
     * of dataMin/dataMax values for axes in a binding that do not
     * already have dataMin/dataMax values set; this forces them
     * to be set based on the binding, as determined by another
     * axis in the binding.
     * 
     * Note that this method is NOT the normal way for bound axes
     * to interact with each other once initialization is
     * complete; that is done via the axes' own setDataRange()
     * method.
     * 
     * @method sync
     * 
     * @return {boolean} a value indicating whether the sync was
     *                   done; this will be true if and only if
     *                   there is at least one axis in the binding
     *                   having both its dataMin and dataMax
     *                   values set.
     */
    this.respondsTo("sync", function() {
        var i,
            axes = this.axes(),
            axis;
        for (i=0; i<axes.length; ++i) {
            axis = axes[i].axis;
            if (axis.hasDataMin() && axis.hasDataMax()) {
                axis.setDataRange(axis.dataMin(), axis.dataMax());
                return true;
            }

        }
        return false;
    });

    /**
     * 
     *
     * @method setDataRange
     * @param {Axis} initiatingAxis
     * @param {number|DataValue} min
     * @param {number|DataValue} max
     * @param {Boolean} dispatch
     * @author jrfrimme
     */
    this.respondsTo("setDataRange", function(initiatingAxis, min, max, dispatch) {

        // NOTE: min and max may either be plain numbers, or
        // DataValue instances.  If they're DataValue instances,
        // get converted to numbers here before being
        // passed to the individual axes' setDataRangeNoBind()
        // method below.

        var initiatingAxisIndex,
            i, j,
            axes = this.axes(),
            axis,
            minRealValue = initiatingAxis.toRealValue(min),
            maxRealValue = initiatingAxis.toRealValue(max),
            redrawn_multigraphs = [],
            redrawn;

        if (dispatch === undefined) {
            dispatch = true; // dispatch defaults to true
        }

        for (i=0; i<axes.length; ++i) {
            if (axes[i].axis === initiatingAxis) {
                initiatingAxisIndex = i;
                redrawn_multigraphs = [ axes[i].multigraph ];
                break;
            }
        }
        for (i=0; i<axes.length; ++i) {
            axis = axes[i];
            if (i === initiatingAxisIndex) {
                axis.axis.setDataRangeNoBind(minRealValue, maxRealValue, dispatch);
            } else {
                axis.axis.setDataRangeNoBind(
                    (minRealValue * axes[initiatingAxisIndex].factor + axes[initiatingAxisIndex].offset - axis.offset) / axis.factor,
                    (maxRealValue * axes[initiatingAxisIndex].factor + axes[initiatingAxisIndex].offset - axis.offset) / axis.factor,
                    dispatch
                );
                if (axis.multigraph !== undefined) {
                    // If this axis has a multigraph stored with it, and if that multigraph isn't already in the `redrawn_multigraphs`
                    // array, call its `redraw` method, and add it to the array.
                    redrawn = false;
                    for (j=0; j<redrawn_multigraphs.length; ++j) {
                        if (axis.multigraph === redrawn_multigraphs[j]) {
                            redrawn = true;
                            break;
                        }
                    }
                    if (!redrawn) {
                        axis.multigraph.redraw();
                        redrawn_multigraphs.push(axis.multigraph);
                    }
                }
            }
        }
    });

    /**
     * 
     *
     * @method getInstanceById
     * @static
     * @param id
     * @author jrfrimme
     */
    AxisBinding.getInstanceById = function(id) {
        return AxisBinding.instances[id];
    };

    /**
     * 
     *
     * @method findByIdOrCreateNew
     * @static
     * @param id
     * @author jrfrimme
     */
    AxisBinding.findByIdOrCreateNew = function(id) {
        var binding = AxisBinding.getInstanceById(id);
        if (!binding) {
            binding = new AxisBinding(id);
        }
        return binding;
    };

    /**
     * 
     *
     * @method syncAllBindings
     * @static
     * @author jrfrimme
     */
    AxisBinding.syncAllBindings = function() {
        var id;
        for (id in AxisBinding.instances) {
            AxisBinding.instances[id].sync();
        }
    };

    /**
     * 
     *
     * @method forgetAllBindings
     * @static
     * @author jrfrimme
     */
    AxisBinding.forgetAllBindings = function() {

        // This function is just for use in testing, so we can clear out the global list
        // of bindings to get a fresh start between tests.

        var id,j,binding;

        // loop over all bindings, all axes, setting the axis binding to null
        for (id in AxisBinding.instances) {
            binding = AxisBinding.instances[id];
            for (j=0; j<binding.axes().length; ++j) {
                binding.axes()[j].axis.binding(null);
            }
        }

        // reset the global binding list
        AxisBinding.instances = {};
    };

});

module.exports = AxisBinding;

},{"../../lib/jermaine/src/jermaine.js":9}],21:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues    = utilityFunctions.getDefaultValuesFromXSD(),
    attributes       = utilityFunctions.getKeys(defaultValues.horizontalaxis.title),
    Point            = require('../math/point.js');

/**
 * Axis Title is a Jermaine model that supports the rendering of Axis Titles.
 *
 * @class AxisTitle
 * @for AxisTitle
 * @constructor
 * @param {Axis} axis
 */
var AxisTitle = new jermaine.Model("AxisTitle", function () {
    
    /**
     * Pointer to the Title's parent Axis jermiane model.
     *
     * @property axis
     * @type {Axis}
     * @author jrfrimme
     */
    this.hasA("axis").which.validatesWith(function (axis) {
        var Axis = require('./axis.js');
        return axis instanceof Axis;
    });
    /**
     * The value which is used as the title string.
     *
     * @property content
     * @type {Text}
     * @author jrfrimme
     */
    this.hasA("content").which.validatesWith(function (content) {
        var Text = require('./text.js');
        return content instanceof Text;
    });
    /**
     * The value which gives the location of the Title's anchor point to be attached to the
     * base point.
     *
     * @property anchor
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("anchor").which.validatesWith(function (anchor) {
        return anchor instanceof Point;
    });
    /**
     * The value which gives the location of the base point relative to the Title's Axis.
     *
     * @property base
     * @type {Number}
     * @author jrfrimme
     */
    this.hasA("base").which.isA("number");
    /**
     * A coordinate pair of pixel offsets for the base point.
     *
     * @property position
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });
    /**
     * The value which determines the rotation of the Title in degrees.
     *
     * @property angle
     * @type {Number}
     * @author jrfrimme
     */
    this.hasA("angle").which.isA("number");

    this.isBuiltWith("axis");

    /**
     * Determines values for the `position` and `anchor` attributes if they were not set; determines the
     * geometry of the `content` attribute. Called by `Axis.initializeGeometry()`.
     *
     * @method initializeGeometry
     * @param {Graph} graph
     * @param {Object} graphicsContext
     * @chainable
     * @author jrfrimme
     */
    this.respondsTo("initializeGeometry", function (graph, graphicsContext) {
        var Axis = require('./axis.js');
        var titleDefaults = defaultValues.horizontalaxis.title,
            axis     = this.axis(),
            position = this.position,
            anchor   = this.anchor,
            plotBox  = graph.plotBox(),
            axisPerpOffset   = axis.perpOffset(),
            axisIsHorizontal = (axis.orientation() === Axis.HORIZONTAL);

        var getValue = function (valueOrFunction) {
            if (typeof(valueOrFunction) === "function") {
                return valueOrFunction();
            } else {
                return valueOrFunction;
            }
        };

        if (position() === undefined) {
            if (axisIsHorizontal) {
                if (axisPerpOffset > plotBox.height()/2) {
                    position( getValue(titleDefaults["position-horizontal-top"]) );
                } else {
                    position( getValue(titleDefaults["position-horizontal-bottom"]) );
                }
            } else {
                if (axisPerpOffset > plotBox.width()/2) {
                    position( getValue(titleDefaults["position-vertical-right"]) );
                } else {
                    position( getValue(titleDefaults["position-vertical-left"]) );
                }
            }
        }

        if (anchor() === undefined) {
            if (axisIsHorizontal) {
                if (axisPerpOffset > plotBox.height()/2) {
                    anchor( getValue(titleDefaults["anchor-horizontal-top"]) );
                } else {
                    anchor( getValue(titleDefaults["anchor-horizontal-bottom"]) );
                }
            } else {
                if (axisPerpOffset > plotBox.width()/2) {
                    anchor( getValue(titleDefaults["anchor-vertical-right"]) );
                } else {
                    anchor( getValue(titleDefaults["anchor-vertical-left"]) );
                }
            }
        }

        graphicsContext.angle = this.angle();
        this.content().initializeGeometry(graphicsContext);

        return this;
    });

    /**
     * Renders the Axis Title. Overridden by implementations in graphics drivers.
     *
     * @method render
     * @private
     * @author jrfrimme
     */
    this.respondsTo("render", function () {});

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis.title, attributes);
});

module.exports = AxisTitle;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/point.js":103,"../util/utilityFunctions.js":132,"./axis.js":19,"./text.js":63}],22:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues    = utilityFunctions.getDefaultValuesFromXSD(),
    attributes       = utilityFunctions.getKeys(defaultValues.background),
    RGBColor         = require('../math/rgb_color.js'),
    Img              = require('./img.js');

var Background = new jermaine.Model("Background", function () {
    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    }).defaultsTo(RGBColor.parse(defaultValues.background.color));
    this.hasA("img").which.validatesWith(function (img) {
        return img instanceof Img;
    });
});

module.exports = Background;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"./img.js":43}],23:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');


var ConstantPlot = new jermaine.Model("ConstantPlot", function () {
    var utilityFunctions = require('../util/utilityFunctions.js'),
        defaultValues    = utilityFunctions.getDefaultValuesFromXSD(),
        attributes       = utilityFunctions.getKeys(defaultValues.plot),
        Plot             = require('./plot.js'),
        DataValue        = require('./data_value.js');

    this.isA(Plot);
    this.hasA("constantValue").which.validatesWith(DataValue.isInstance);

    this.isBuiltWith("constantValue");

    utilityFunctions.insertDefaults(this, defaultValues.plot, attributes);

    this.respondsTo("render", function (graph, graphicsContext) {
        // graphicsContext is an optional argument passed to ConstantPlot.render() by the
        // graphics driver, and used by that driver's implementation of Renderer.begin().
        // It can be any object used by the driver -- usually some kind of graphics
        // context object.  It can also be omitted if a driver does not need it.

        var haxis = this.horizontalaxis(),
            renderer = this.renderer(),
            constantValue = this.constantValue();

        if (!haxis.hasDataMin() || !haxis.hasDataMax()) {
            return;
        }

        renderer.setUpMissing(); //TODO: this is awkward -- figure out a better way!
        renderer.begin(graphicsContext);
        renderer.dataPoint([ haxis.dataMin(), constantValue ]);
        renderer.dataPoint([ haxis.dataMax(), constantValue ]);
        renderer.end();

    });

});

module.exports = ConstantPlot;


},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./data_value.js":29,"./plot.js":53}],24:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
var CSVData;
module.exports = function($) {
    if (typeof(CSVData) !== "undefined") { return CSVData; }

    var jermaine = require('../../lib/jermaine/src/jermaine.js'),
        ArrayData = require('./array_data.js');

    CSVData = new jermaine.Model(function () {

        this.isA(ArrayData);
        this.hasA("filename").which.isA("string");
        this.hasA("messageHandler");
        this.hasA("ajaxthrottle");
        this.hasA("dataIsReady").which.isA("boolean").and.defaultsTo(false);

        this.respondsTo("getIterator", function (columnIds, min, max, buffer) {
            if (this.dataIsReady()) {
                return ArrayData.getArrayDataIterator(this, columnIds, min, max, buffer);
            } else {
                return {
                    "next"    : function () {},
                    "hasNext" : function () { return false; }
                };
            }
        });

        this.respondsTo("_displayError", function (e) {
            if (this.messageHandler()) {
                this.messageHandler().error(e);
            } else {
                throw e;
            }
        });

        this.isBuiltWith("columns", "filename", "%messageHandler", "%ajaxthrottle", function () {
            var that         = this,
                ajaxthrottle = this.ajaxthrottle();

            if (ajaxthrottle === undefined) {
                ajaxthrottle = $;
            }

            this.adapter(ArrayData);
            this.init();

            if (that.filename() !== undefined) {
                that.emit({type : 'ajaxEvent', action : 'start'});
                ajaxthrottle.ajax({
                    url : that.filename(),

                    success : function (data) {
                        //parse the data
                        var dataValues = that.adapter().textToStringArray(that.getColumns(), data);
                        that.stringArray(dataValues);
                        // renormalize & populate array
                        that.ajaxNormalize();
                        that.dataIsReady(true);
                        that.emit({type : "dataReady"});
                    },

                    error : function (jqXHR, textStatus, errorThrown) {
                        var message = errorThrown;
                        if (jqXHR.statusCode().status === 404) {
                            message = "File not found: '" + that.filename() + '"';
                        } else {
                            if (textStatus) {
                                message = textStatus + ": " + message;
                            }
                        }
                        that._displayError(new Error(message));
                    },

                    // 'complete' callback gets called after either 'success' or 'error', whichever:
                    complete : function (jqXHR, textStatus) {
                        that.emit({type : 'ajaxEvent', action : 'complete'});
                    }

                });
            }
        });
    });

    return CSVData;
};

},{"../../lib/jermaine/src/jermaine.js":9,"./array_data.js":18}],25:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var EventEmitter = require('./event_emitter.js'),
    DataValue = require('../core/data_value.js'),
    DataVariable = require('./data_variable.js');

var Data = new jermaine.Model(function () {
    
    this.isA(EventEmitter);

    /**
     * Searches through a jermaine attr_list of DataVariables (columns) for
     * an entry having a given id or column number.
     *
     * @method find
     * @private
     * @param {String} attrName The name of the attribute to search on;
     *     should be either "id" or "column".
     * @param {String|Integer} attrValue The value to search for. If attrName
     *     is "id", this value should be a string.  If attrName is "column",
     *     this value should be an int.
     * @param {DataVariable Attr_List} columns The attr_list to search through.
     * @static
     * @return {Integer} The index (an int) of the DataVariable entry having
     *     the given attribute value, if any, or -1 if none was found
     * @author jrfrimme
     *
     * @example
     *
     *     find("id", "x", columns)
     *
     *         finds the index of the DataVariable in the columns attr_list
     *         having an id of "x"
     *
     *     find("column", 1, columns)
     *
     *         finds the index of the DataVariable in the columns attr_list
     *         having a "column" attribute of 1
     */
    var find = function (attrName, attrValue, columns) {
        var result = -1,
            i;
        for (i = 0; i < columns.size(); ++i) {
            if (columns.at(i)[attrName]() === attrValue) {
                result = i;
                break;
            }
        }
        return result;
    };

    /**
     * Set the `data` attribute of each of this data object's columns
     * to point to the data object itself.
     *
     * @method initializeColumns
     * @author jrfrimme
     */
    this.respondsTo("initializeColumns", function () {
        var i;
        for (i = 0; i < this.columns().size(); ++i) {
            this.columns().at(i).data(this);
        }
    });

    this.hasMany("columns").eachOfWhich.validateWith(function (column) {
        this.message = "Data: constructor parameter should be an array of DataVariable objects";
        return column instanceof DataVariable;
    });

    this.hasA("defaultMissingvalue").which.isA("string");
    this.hasA("defaultMissingop").which.isA("string").and.defaultsTo("eq");
    this.hasA("adapter");

    /**
     * Initialization function --- should be called from isBuiltWith initializer.  This is split
     * off into a separate function so that it can be called from submodel's isBuiltWith initializers
     * as well, since Jermaine does not provide a way to call the parent models' isBuiltWith initializer
     * function.
     *
     * @method init
     * @author jrfrimme
     */
    this.respondsTo("init", function() {
        this.initializeColumns();
    });

    this.isBuiltWith("columns", function () {
        this.init();
    });

    this.respondsTo("columnIdToColumnNumber", function (id) {
        if (typeof(id) !== "string") {
            throw new Error("Data: columnIdToColumnNumber expects parameter to be a string");
        }

        var columnIndex = find("id", id, this.columns()),
            column = undefined;

        if (columnIndex >= 0) {
            column = this.columns().at(columnIndex);
        }

        if (column === undefined) {
            throw new Error("Data: no column with the label " + id);
        }
        
        return column.column();
    });

    this.respondsTo("columnIdToDataVariable", function (id) {
        if (typeof(id) !== "string") {
            throw new Error("Data: columnIdToDataVariable requires a string parameter");
        }
        
        var columns = this.columns(),
            dv = find("id", id, columns) !== -1 ? columns.at(find("id", id, columns)) : undefined;

        if (dv === undefined) {
            throw new Error("Data: no column with the label " + id);
        }

        return dv;
    });

    this.respondsTo("getColumnId", function (column) {
        if (typeof(column) !== "number") {
            throw new Error("Data: getColumnId method expects an integer");
        }

        var result = find("column", column, this.columns());

        if (result === -1) {
            throw new Error("Data: column " + column + " does not exist");
        }
        
        return this.columns().at(result).id();
    });

    this.respondsTo("getColumns", function () {
        var result = [],
            columns = this.columns(),
            i;

        for (i = 0; i < columns.size(); ++i) {
            result.push(columns.at(i));
        }

        return result;
    });

    this.respondsTo("getBounds", function (columnNumber) {
        // submodels must implement this
    });

    this.respondsTo("getIterator", function () {
        // submodels must implement this
    });

    /*
     * The "onReady" contract:
     * 
     * Each submodel of this Data model should do the following:
     * 
     * 1. Emit an "onReady" event whenever new data is available.
     *    The arguments to the event listener are the min and max
     *    values of the range of (newly) available data.
     * 
     * 2. Optionally, register a listener for its own "listenerAdded"
     *    events, which performs whatever actions are needed, if any,
     *    when a new "onReady" listener is registered.
     */

    this.respondsTo("pause", function() {
        //no op
    });
    this.respondsTo("resume", function() {
        //no op
    });

    this.respondsTo("isMissing", function (value, i) {
        // This method should return true if the DataValue "value" meets the "missing" criteria of
        // the i-th column
        var column;
        if (i < 0 || i >= this.columns().size()) {
            throw new Error("metadata.isMissing(): index out of range");
        }
        column = this.columns().at(i);
        if (!column.missingvalue() || !column.missingop()) {
            return false;
        }
        return value[column.missingop()](column.missingvalue());
    });

    // Sorts variables into appropriate order
    var sortVariables = function (data, sortedVariables, unsortedVariables) {
        var columns = data.columns(),
            column,
            i;
        for (i = 0; i < columns.size(); i++) {
            column = columns.at(i);
            if (column.column() !== undefined) {
                sortedVariables[column.column()] = column;
            } else {
                unsortedVariables.push(column);
            }
        }
    };

    // creates placeholder variables
    var createPlaceholderVariables = function (data, unsortedVariables) {
        var numMissingVariables = data.stringArray()[0].length - data.columns().size(),
            i;
        if (numMissingVariables > 0) {
            for (i = 0; i < numMissingVariables; i++) {
                unsortedVariables.push(null);
            }
        }
    };

    // inserts unsorted variables into the correct location
    var insertUnsortedVariables = function (sortedVariables, unsortedVariables) {
        var index, i;
        for (i = 0, index = 0; i < unsortedVariables.length; i++) {
            while (true) {
                if (sortedVariables[index] === undefined) {
                    break;
                }
                index++;
            }
            sortedVariables[index] = unsortedVariables[i];
        }
    };

    // checks that columns were correctly specified
    var checkColumnIndicies = function (data, sortedVariables) {
        var length = data.stringArray()[0].length,
            i;
        if (sortedVariables.length > length) {
            for (i = 0; i < sortedVariables.length; i++) {
                if (sortedVariables[i] instanceof DataVariable && sortedVariables[i].column() > length) {
                    throw new Error("Data Variable Error: Attempting to specify column '" + sortedVariables[i].column() + "' for a variable, while there are only " + length + " data columns available");
                }
            }                    
        }
    };

    // Handles missing attributes
    // creates the appropriate variables if missing
    var handleMissingAttributes = function (sortedVariables, defaultMissingop, defaultMissingvalue) {
        var defaultid,
            i;
        defaultMissingop = DataValue.parseComparator(defaultMissingop);
        for (i = 0; i < sortedVariables.length; i++) {
            if (!sortedVariables[i]) {
                if (i === 0) {
                    defaultid = "x";
                } else if (i === 1) {
                    defaultid = "y";
                } else {
                    defaultid = "y" + (i-1);
                }
                sortedVariables[i] = new DataVariable(defaultid, i, DataValue.NUMBER);
            } else {
                if (sortedVariables[i].column() === undefined) {
                    sortedVariables[i].column(i);
                }
                if (sortedVariables[i].type() === undefined) {
                    sortedVariables[i].type(DataValue.NUMBER);
                }
            }

            if (defaultMissingvalue !== undefined) {
                if (sortedVariables[i].missingvalue() === undefined) {
                    sortedVariables[i].missingvalue(DataValue.parse(sortedVariables[i].type(), defaultMissingvalue));
                }
            }
            if (sortedVariables[i].missingop() === undefined) {
                sortedVariables[i].missingop(defaultMissingop);
            }
        }
    };

    // Inserts the normalized variables into the data instance
    var insertNormalizedVariables = function (data, sortedVariables) {
        var columns = data.columns(),
            i;
        while (columns.size() > 0) {
            columns.pop();
        }
        for (i = 0; i < sortedVariables.length; i++) {
            columns.add(sortedVariables[i]);
        }
        data.initializeColumns();
    };


    // parses string values into the proper data types
    // If there was actual data, validate that the number of values found in stringArray
    // as large as the the number of variables declared.  ArrayData.textToStringArray(),
    // which is the function that constructed stringArray, has already guaranteed that
    // every row in stringArray is of the same length, so we can use the length of the
    // first row as the number of variables.
    var createDataValueArray = function (data, sortedVariables) {
        var ArrayData = require('./array_data.js');
        var stringArray = data.stringArray();
        if (stringArray.length > 0) {
            if (stringArray[0].length < sortedVariables.length) {
                throw new Error("data contains only " + stringArray[0].length + " column(s), but should contain " + sortedVariables.length);
            }
        }

        var dataValues = ArrayData.stringArrayToDataValuesArray(sortedVariables, stringArray);

        data.array(dataValues);
        data.stringArray([]);
    };

    this.prototype.normalize = function () {
        var ArrayData = require('./array_data.js'),
            sortedVariables   = [],
            unsortedVariables = [],
            //  mbp Tue Mar  3 10:51:40 2015:
            //    avoid requiring web_service_data.js and csv_data.js here because they have
            //    a dependency on jQuery; also avoid instanceof
            //CSVData = require('./csv_data.js'),
            //WebServiceData = require('./web_service_data.js'),
            //isCsvOrWebService = this instanceof CSVData || this instanceof WebServiceData,
            isWebServiceData = (typeof(this.serviceaddress) === "function"),
            isCSVData = (typeof(this.filename) === "function"),
            isCsvOrWebService = isWebServiceData || isCSVData;

        // Handles missing variable tags if the data tag has a 'csv' or 'service' tag
        if (isCsvOrWebService) {
            if (this.columns().size() === 0) {
                throw new Error("Data Normalization: Data gotten from csv and web service sources require variables to be specified in the mugl.");
            }
        }

        sortVariables(this, sortedVariables, unsortedVariables);

        // creates placeholder variables if the data tag has a 'values' tag
        if (this instanceof ArrayData === true && !isCsvOrWebService) {
            createPlaceholderVariables(this, unsortedVariables);
        }

        insertUnsortedVariables(sortedVariables, unsortedVariables);

        // checks that columns were correctly specified for 'values' data tags
        if (this instanceof ArrayData === true && !isCsvOrWebService) {
            checkColumnIndicies(this, sortedVariables);
        }

        handleMissingAttributes(sortedVariables, this.defaultMissingop(), this.defaultMissingvalue());
        insertNormalizedVariables(this, sortedVariables);

        // parses string values into the proper data types if the data tag has a 'values' tag
        if (this instanceof ArrayData === true && !isCsvOrWebService) {
            createDataValueArray(this, sortedVariables);
        }
    };

    this.prototype.ajaxNormalize = function () {
        var sortedVariables   = [],
            unsortedVariables = [];

        sortVariables(this, sortedVariables, unsortedVariables);
        createPlaceholderVariables(this, unsortedVariables);
        insertUnsortedVariables(sortedVariables, unsortedVariables);
        checkColumnIndicies(this, sortedVariables);
        handleMissingAttributes(sortedVariables, this.defaultMissingop(), this.defaultMissingvalue());
        insertNormalizedVariables(this, sortedVariables);
        createDataValueArray(this, sortedVariables);
    };

});

module.exports = Data;

},{"../../lib/jermaine/src/jermaine.js":9,"../core/data_value.js":29,"./array_data.js":18,"./data_variable.js":30,"./event_emitter.js":37}],26:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataValue = require('./data_value.js'),
    NumberFormatter = require('./number_formatter.js'),
    DatetimeFormatter = require('./datetime_formatter.js');

var DataFormatter = {};
/*
 * Return true or false depending on whether obj is an instance of a DataFormatter type
 */
DataFormatter.isInstance = function (obj) {
    return (obj && (typeof(obj.format) === "function") && (typeof(obj.getMaxLength) === "function"));
};

/*
 * Create a new DataFormatter subtype of a given type
 */
DataFormatter.create = function (type, format) {
    if (type === DataValue.NUMBER) {
        return new NumberFormatter(format);
    } else if (type === DataValue.DATETIME) {
        return new DatetimeFormatter(format);
    }
    throw new Error("attempt to create an unknown DataFormatter type");
};

module.exports = DataFormatter;

},{"../../lib/jermaine/src/jermaine.js":9,"./data_value.js":29,"./datetime_formatter.js":33,"./number_formatter.js":48}],27:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataValue = require('./data_value.js'),
    NumberMeasure = require('./number_measure.js'),
    DatetimeMeasure = require('./datetime_measure.js');

var DataMeasure = {};

/*
 * Return true or false depending on whether obj is an instance of a DataMeasure type
 */
DataMeasure.isInstance = function (obj) {
    return (obj && (typeof(obj.getRealValue) === "function") && (!obj.compareTo));
};

/*
 * Create a new DataMeasure subtype of a given type by parsing a string
 */
DataMeasure.parse = function (type, string) {
    if (type === DataValue.NUMBER) {
        return NumberMeasure.parse(string);
    } else if (type === DataValue.DATETIME) {
        return DatetimeMeasure.parse(string);
    }
    throw new Error("attempt to parse an unknown DataMeasure type");
};

module.exports = DataMeasure;

},{"../../lib/jermaine/src/jermaine.js":9,"./data_value.js":29,"./datetime_measure.js":34,"./number_measure.js":49}],28:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Plot = require('./plot.js'),
    DataVariable = require('./data_variable.js'),
    Filter = require('./filter.js'),
    Datatips = require('./datatips.js'),
    Data = require('./data.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot);

var DataPlot = new jermaine.Model("DataPlot", function () {
    this.isA(Plot);
    this.hasMany("variable").eachOfWhich.validateWith(function (variable) {
        return variable instanceof DataVariable || variable === null;
    });
    this.hasA("filter").which.validatesWith(function (filter) {
        return filter instanceof Filter;
    });
    this.hasA("datatips").which.validatesWith(function (datatips) {
        return datatips instanceof Datatips;
    });
    this.hasA("data").which.validatesWith(function (data) {
        return data instanceof Data;
    });

    utilityFunctions.insertDefaults(this, defaultValues.plot, attributes);

    this.respondsTo("render", function (graph, graphicsContext) {
        // graphicsContext is an optional argument passed to DataPlot.render() by the
        // graphics driver, and used by that driver's implementation of Renderer.begin().
        // It can be any objectded by the driver -- usually some kind of graphics
        // context object.  It can also be omitted if a driver does not need it.
        //var data = this.data().arraydata();
        var data = this.data();
        if (! data) { return; }

        var haxis = this.horizontalaxis(),
            vaxis = this.verticalaxis();

        if (!haxis.hasDataMin() || !haxis.hasDataMax()) {
            // if this plot's horizontal axis does not have a min or max value yet,
            // return immediately without doing anything
            return;
        }

        var variables   = this.variable(),
            variableIds = [],
            i;
        for (i = 0; i < variables.size(); ++i) {
            variableIds.push( variables.at(i).id() );
        }

        var iter = data.getIterator(variableIds, haxis.dataMin(), haxis.dataMax(), 1),
            renderer = this.renderer();

        renderer.setUpMissing(); //TODO: this is awkward -- figure out a better way!
        renderer.begin(graphicsContext);
        while (iter.hasNext()) {
            var datap = iter.next();
            renderer.dataPoint(datap);
        }
        renderer.end();

    });


});

module.exports = DataPlot;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./data.js":25,"./data_variable.js":30,"./datatips.js":31,"./filter.js":38,"./plot.js":53}],29:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/*
 * DataValue is a POJSO (plain old javascript object) that simply
 * serves as an ecapsulation for several generic
 * data-value-related constants and functions.  There is no actual
 * DataValue model that can be instantiated; all data values are
 * instances of either the NumberValue or DatetimeValue model.
 */

var DataValue = {};

DataValue.NUMBER = "number";
DataValue.DATETIME = "datetime";
DataValue.UNKNOWN = "unknown";

/*
 * Return a list of the type constants above
 */
DataValue.types = function () {
    return [ DataValue.NUMBER, DataValue.DATETIME, DataValue.UNKNOWN ];
};

/*
 * Create a new DataValue subtype of a given type by parsing a string
 */
DataValue.parseType = function (string) {
    if (string.toLowerCase() === DataValue.NUMBER) { return DataValue.NUMBER; }
    if (string.toLowerCase() === DataValue.DATETIME) { return DataValue.DATETIME; }
    throw new Error("unknown DataValue type: " + string);
};

/*
 * This function converts a "type" enum object to a string.  In reality, the objects ARE
 * the strings, so we just return the object.
 */
DataValue.serializeType = function (type) {
    return type;
};

/*
 * Return true or false depending on whether obj is an instance of a DataValue type
 */
DataValue.isInstance = function (obj) {
    return (obj && (typeof(obj.getRealValue) === "function") && (typeof(obj.compareTo) === "function"));
};

/*
 * Same as DataValue.isInstance, but also allows the null value
 */
DataValue.isInstanceOrNull = function (obj) {
    return ((obj===null) || DataValue.isInstance(obj));
};

/*
 * Create a new DataValue subtype of a given type from a real value
 */
DataValue.create = function (type, realValue) {
    var NumberValue = require('./number_value.js'),
        DatetimeValue = require('./datetime_value.js');

    if (type === DataValue.NUMBER) {
        return new NumberValue(realValue);
    } else if (type === DataValue.DATETIME) {
        return new DatetimeValue(realValue);
    }
    throw new Error("attempt to parse an unknown DataValue type");
};

/*
 * Create a new DataValue subtype of a given type by parsing a string
 */
DataValue.parse = function (type, string) {
    var NumberValue = require('./number_value.js'),
        DatetimeValue = require('./datetime_value.js');

    if (type === DataValue.NUMBER) {
        return NumberValue.parse(string);
    } else if (type === DataValue.DATETIME) {
        return DatetimeValue.parse(string);
    }
    throw new Error("attempt to parse an unknown DataValue type");
};

/*
 * Enum values for comparison operators.  These should be lowercase strings --- they're used as
 * actual method names below.
 */
DataValue.LT = "lt";
DataValue.LE = "le";
DataValue.EQ = "eq";
DataValue.GE = "ge";
DataValue.GT = "gt";
DataValue.NE = "ne";

var comparatorFuncs = {};
comparatorFuncs[DataValue.LT] = function (x) { return this.compareTo(x)   < 0; };
comparatorFuncs[DataValue.LE] = function (x) { return this.compareTo(x)  <= 0; };
comparatorFuncs[DataValue.EQ] = function (x) { return this.compareTo(x) === 0; };
comparatorFuncs[DataValue.GE] = function (x) { return this.compareTo(x)  >= 0; };
comparatorFuncs[DataValue.GT] = function (x) { return this.compareTo(x)   > 0; };
comparatorFuncs[DataValue.NE] = function (x) { return this.compareTo(x) !== 0; };

/*
 * Mix the 5 comparator function into another object:
 */
DataValue.mixinComparators = function (obj) {
    obj[DataValue.LT] = comparatorFuncs[DataValue.LT];
    obj[DataValue.LE] = comparatorFuncs[DataValue.LE];
    obj[DataValue.EQ] = comparatorFuncs[DataValue.EQ];
    obj[DataValue.GE] = comparatorFuncs[DataValue.GE];
    obj[DataValue.GT] = comparatorFuncs[DataValue.GT];
    obj[DataValue.NE] = comparatorFuncs[DataValue.NE];
};

/*
 * The comparators function returns a list of the 5 comparator
 * functions, to be used like an enum type.
 */
DataValue.comparators = function () {
    return [ DataValue.LT, DataValue.LE, DataValue.EQ, DataValue.GE, DataValue.GT, DataValue.NE ];
};

/*
 * Convert a string to a comparator enum object:
 */
DataValue.parseComparator = function (string) {
    if (typeof(string) === "string") {
        switch (string.toLowerCase()) {
        case "lt": return DataValue.LT;
        case "le": return DataValue.LE;
        case "eq": return DataValue.EQ;
        case "ge": return DataValue.GE;
        case "gt": return DataValue.GT;
        case "ne": return DataValue.NE;
        }
    }
    throw new Error(string + " should be one of 'lt', 'le', 'eq', 'ge', 'gt', 'ne'.");
};

module.exports = DataValue;

},{"../../lib/jermaine/src/jermaine.js":9,"./datetime_value.js":36,"./number_value.js":50}],30:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataValue = require('./data_value.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.data.variables.variable);

var DataVariable = new jermaine.Model("DataVariable", function () {
    this.hasA("id").which.isA("string");
    this.hasA("column").which.isA("integer");
    this.hasA("type").which.isOneOf(DataValue.types()).and.defaultsTo(DataValue.NUMBER);
    this.hasA("data").which.validatesWith(function (data) {
        var Data = require('./data.js');
        return data instanceof Data;
    });
    this.hasA("missingvalue").which.validatesWith(DataValue.isInstance);

    this.hasA("missingop").which.isOneOf(DataValue.comparators());
    this.isBuiltWith("id", "%column", "%type");

    utilityFunctions.insertDefaults(this, defaultValues.data.variables.variable, attributes);
});

module.exports = DataVariable;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./data.js":25,"./data_value.js":29}],31:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DatatipsVariable = require('./datatips_variable.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    RGBColor = require('../math/rgb_color.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.datatips);

var Datatips = new jermaine.Model("Datatips", function () {
    this.hasMany("variables").eachOfWhich.validateWith(function (variable) {
        return variable instanceof DatatipsVariable;
    });
    this.hasA("format").which.validatesWith(function (format) {
        return typeof(format) === "string";
    });
    this.hasA("bgcolor").which.validatesWith(function (bgcolor) {
        return bgcolor instanceof RGBColor;
    });
    this.hasA("bgalpha").which.validatesWith(function (bgalpha) {
        return typeof(bgalpha) === "string";
    });
    this.hasA("border").which.isA("integer");
    this.hasA("bordercolor").which.validatesWith(function (bordercolor) {
        return bordercolor instanceof RGBColor;
    });
    this.hasA("pad").which.isA("integer");

    utilityFunctions.insertDefaults(this, defaultValues.plot.datatips, attributes);
});

module.exports = Datatips;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"./datatips_variable.js":32}],32:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.datatips.variable);

var DatatipsVariable = new jermaine.Model("DatatipsVariable", function () {
    this.hasA("format").which.validatesWith(function (format) {
        return typeof(format) === "string";
    });

    utilityFunctions.insertDefaults(this, defaultValues.plot.datatips.variable, attributes);
});

module.exports = DatatipsVariable;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132}],33:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var sprintf = require('sprintf');

var DatetimeFormatter = function (format) {
    var testString;
    if (typeof(format) !== "string") {
        throw new Error("format must be a string");
    }
    this.formatString = format;
    testString = DatetimeFormatter.formatInternally(format, new Date(0));
    this.length = testString.length;
};

DatetimeFormatter.prototype.format = function (value) {
    return DatetimeFormatter.formatInternally(this.formatString, value.value);
};

DatetimeFormatter.prototype.getMaxLength = function () {
    return this.length;
};

DatetimeFormatter.prototype.getFormatString = function () {
    return this.formatString;
};

DatetimeFormatter.formatInternally = function (formatString, date) {
    var dayNames = {
        "shortNames": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "longNames": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    },
        monthNames = {
            "shortNames": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
            "longNames": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
        },
        state = 0,
        c,
        i,
        t,
        output = "";

    for (i = 0; i < formatString.length; i++) {
        c = formatString.charAt(i);
        switch (state) {
        case 0:
            if (c === "%") {
                state = 1;
            } else {
                output += c;
            }
            break;
        case 1:
            switch (c) {
            case "Y":
                // four digit year
                output += date.getUTCFullYear().toString();
                break;
            case "y":
                // two digit year
                output += date.getUTCFullYear().toString().substr(2, 2);
                break;
            case "M":
                // 2-digit month number with leading zero
                output += sprintf("%02s", (date.getUTCMonth() + 1).toString());
                break;
            case "m":
                // month number without leading zero
                output += (date.getUTCMonth() + 1).toString();
                break;
            case "N":
                // month name, spelled out
                output += monthNames.longNames[date.getUTCMonth()];
                break;
            case "n":
                // month name, 3 letter abbreviation
                output += monthNames.shortNames[date.getUTCMonth()];
                break;
            case "D":
                // two-digit day of month with leading zero
                output += sprintf("%02s", date.getUTCDate().toString());
                break;
            case "d":
                // day of month without leading zero
                output += date.getUTCDate().toString();
                break;
            case "W":
                // weekday name, spelled out
                output += dayNames.longNames[date.getUTCDay()];
                break;
            case "w":
                // weekday name, 3-letter abbreviation
                output += dayNames.shortNames[date.getUTCDay()];
                break;
            case "H":
                // hour of day, 24 hour clock
                output += sprintf("%02s", date.getUTCHours().toString());
                break;
            case "h":
                // hour of day, 12 hour clock
                t = date.getUTCHours() % 12;
                if (t === 0) {
                    output += "12";
                } else {
                    output += t.toString();
                }
                break;
            case "i":
                // minutes
                output += sprintf("%02s", date.getUTCMinutes().toString());
                break;
            case "s":
                // seconds
                output += sprintf("%02s", date.getUTCSeconds().toString());
                break;
            case "v":
                // deciseconds (10ths of a second)
                output += sprintf("%03s", date.getUTCMilliseconds().toString()).substr(0, 1);
                break;
            case "V":
                // centiseconds (100ths of a second)
                output += sprintf("%03s", date.getUTCMilliseconds().toString()).substr(0, 2);
                break;
            case "q":
                // milliseconds (1000ths of a second)
                output += sprintf("%03s", date.getUTCMilliseconds().toString());
                break;
            case "P":
                // AM or PM
                t = date.getUTCHours();
                if (t < 12) {
                    output += "AM";
                } else {
                    output += "PM";
                }
                break;
            case "p":
                // am or pm
                t = date.getUTCHours();
                if (t < 12) {
                    output += "am";
                } else {
                    output += "pm";
                }
                break;
            case "L":
                // newline
                output += "\n";
                break;
            case "%":
                // %
                output += "%";
                break;
            default:
                throw new Error("Invalid character code for datetime formatting string");
            }
            state = 0;
            break;
        }
    }
    return output;
};

module.exports = DatetimeFormatter;

},{"../../lib/jermaine/src/jermaine.js":9,"sprintf":17}],34:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DatetimeValue = require('./datetime_value.js'),
    Enum = require('../math/enum.js');

var DatetimeUnit = require('./datetime_unit.js');

var DatetimeMeasure = function (measure, unit) {
    if (typeof(measure) !== "number" || DatetimeMeasure.isUnit(unit) !== true) {
        throw new Error("Improper input for Datetime Measure's constructor");
    } else if (arguments.length !== 2) {
        throw new Error("Datetime Measure's contructor requires exactly two arguments");
    }
    this.measure = measure;
    this.unit    = unit;
};

DatetimeMeasure.isUnit = function (unit) {
    return DatetimeUnit.isInstance(unit);
};

DatetimeMeasure.prototype.negative = function () {
    return new DatetimeMeasure(-this.measure, this.unit);
};

DatetimeMeasure.prototype.getRealValue = function () {
    var factor;
    switch (this.unit) {
    case DatetimeUnit.MILLISECOND:
        factor = 1;
        break;
    case DatetimeUnit.SECOND:
        factor = 1000;
        break;
    case DatetimeUnit.MINUTE:
        factor = 60000;
        break;
    case DatetimeUnit.HOUR:
        factor = 3600000;
        break;
    case DatetimeUnit.DAY:
        factor = 86400000;
        break;
    case DatetimeUnit.WEEK:
        factor = 604800000;
        break;
    case DatetimeUnit.MONTH:
        factor = 2592000000;
        break;
    case DatetimeUnit.YEAR:
        factor = 31536000000;
        break;
    }
    return this.measure * factor;
};

DatetimeMeasure.parse = function (s) {
    var re, measure, unit;

    if (typeof(s) !== "string" || s.match(/\s*-?(([0-9]+\.?[0-9]*)|([0-9]*\.?[0-9]+))\s*(ms|s|m|H|D|W|M|Y){1}\s*$/) === null) {
        throw new Error("Improper input for Datetime Measure's parse method");
    }

    re      = /ms|s|m|H|D|W|M|Y/;
    measure = parseFloat(s.replace(re, ""));
    unit    = s.match(re); // returns an array

    unit = DatetimeUnit.parse(unit[0]);

    return new DatetimeMeasure(measure, unit);
};

DatetimeMeasure.findTickmarkWithMillisecondSpacing = function (/*number(milliseconds)*/value, /*number(milliseconds)*/alignment, /*number(milliseconds)*/spacing) {
    var offset = value - alignment,
        d      = Math.floor( offset / spacing );
    if (offset % spacing !== 0) {
        ++d;
    }
    return new DatetimeValue(alignment + d * spacing);
};

DatetimeMeasure.findTickmarkWithMonthSpacing = function (/*DatetimeValue*/value, /*DatetimeValue*/alignment, /*number(months)*/monthSpacing) {
    var valueD = value.value,       //NOTE: ".value" property of DatetimeValue is a javascript Date object
        alignD = alignment.value,   //NOTE: ".value" property of DatetimeValue is a javascript Date object
        monthOffset = 12 * (valueD.getUTCFullYear() - alignD.getUTCFullYear()) + (valueD.getUTCMonth() - alignD.getUTCMonth()),
        d = Math.floor( monthOffset / monthSpacing );

    if (monthOffset % monthSpacing !== 0) { ++d; }
    else if (valueD.getUTCDate() > alignD.getUTCDate()) { ++d; }
    else if (valueD.getUTCDate() === alignD.getUTCDate() && valueD.getUTCHours() > alignD.getUTCHours()) { ++d; }
    else if (valueD.getUTCDate() === alignD.getUTCDate() && valueD.getUTCHours() === alignD.getUTCHours() && valueD.getUTCMinutes() > alignD.getUTCMinutes()) { ++d; }
    else if (valueD.getUTCDate() === alignD.getUTCDate() && valueD.getUTCHours() === alignD.getUTCHours() && valueD.getUTCMinutes() === alignD.getUTCMinutes() && valueD.getUTCSeconds() > alignD.getUTCSeconds()) { ++d; }
    else if (valueD.getUTCDate() === alignD.getUTCDate() && valueD.getUTCHours() === alignD.getUTCHours() && valueD.getUTCMinutes() === alignD.getUTCMinutes() && valueD.getUTCSeconds() === alignD.getUTCSeconds() && valueD.getUTCMilliseconds() > alignD.getUTCMilliseconds()) { ++d; }

    return alignment.add( DatetimeMeasure.parse((d * monthSpacing) + "M") );
};


/**
 * Consider the regular lattice of points on the Datetime line separated from each other
 * by `this` DatetimeMeasure, and aligned at the DatetimeValue `alignment`.  This function
 * return the smallest DatetimeValue in that lattice which is greater than or equal to
 * `value`.
 * 
 * return: a DatetimeValue
 */
DatetimeMeasure.prototype.firstSpacingLocationAtOrAfter = function (/*DatetimeValue*/value, /*DatetimeValue*/alignment)  {
    switch (this.unit) {
    case DatetimeUnit.MONTH:
        return DatetimeMeasure.findTickmarkWithMonthSpacing(value, alignment, this.measure);
    case DatetimeUnit.YEAR:
        return DatetimeMeasure.findTickmarkWithMonthSpacing(value, alignment, this.measure * 12);
    default:
        return DatetimeMeasure.findTickmarkWithMillisecondSpacing(value.getRealValue(), alignment.getRealValue(), this.getRealValue());
    }
};

/**
 * This function is just like `firstSpacingLocationAtOrAfter` above, but returns the
 * greatest DatetimeValue in the lattice that is less than or equal to `value`.
 * 
 * return: a DatetimeValue
 */
DatetimeMeasure.prototype.lastSpacingLocationAtOrBefore = function (/*DatetimeValue*/value, /*DatetimeValue*/alignment)  {
    var x = this.firstSpacingLocationAtOrAfter(value, alignment);
    if (x.eq(value)) {
        return x;
    }
    var y = x.add(this.negative());
    return y;
};

DatetimeMeasure.prototype.toString = function () {
    return this.measure.toString() + this.unit.toString();
};


module.exports = DatetimeMeasure;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/enum.js":101,"./datetime_unit.js":35,"./datetime_value.js":36}],35:[function(require,module,exports){
var Enum = require('../math/enum.js');

var DatetimeUnit = new Enum("DatetimeUnit");

DatetimeUnit.MILLISECOND = new DatetimeUnit("ms");
DatetimeUnit.SECOND      = new DatetimeUnit("s");
DatetimeUnit.MINUTE      = new DatetimeUnit("m");
DatetimeUnit.HOUR        = new DatetimeUnit("H");
DatetimeUnit.DAY         = new DatetimeUnit("D");
DatetimeUnit.WEEK        = new DatetimeUnit("W");
DatetimeUnit.MONTH       = new DatetimeUnit("M");
DatetimeUnit.YEAR        = new DatetimeUnit("Y");

module.exports = DatetimeUnit;

},{"../math/enum.js":101}],36:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataValue = require('./data_value.js'),
    DatetimeUnit = require('./datetime_unit.js'),
    sprintf = require('sprintf');

var DatetimeValue = function (value) {
    if (typeof(value) !== "number") {
        throw new Error("DatetimeValue requires its parameter to be a number");
    }
    this.value = new Date(value);
};

DatetimeValue.prototype.getRealValue = function () {
    return this.value.getTime();
};

DatetimeValue.prototype.type = DataValue.DATETIME;

DatetimeValue.prototype.clone = function() {
    return new DatetimeValue(this.getRealValue());
};

DatetimeValue.parse = function (string) {
    var Y = 0,
        M = 0,
        D = 1,
        H = 0,
        m = 0,
        s = 0,
        ms = 0;
    if (typeof(string) === "string") {
        string = string.replace(/[\.\-\:\s]/g, "");
        if (string.length === 4) {
            Y = parseInt(string, 10);
        } else if (string.length === 6) {
            Y = parseInt(string.substring(0,4), 10);
            M = parseInt(string.substring(4,6), 10) - 1;
        } else if (string.length === 8) {
            Y = parseInt(string.substring(0,4), 10);
            M = parseInt(string.substring(4,6), 10) - 1;
            D = parseInt(string.substring(6,8), 10);
        } else if (string.length === 10) {
            Y = parseInt(string.substring(0,4), 10);
            M = parseInt(string.substring(4,6), 10) - 1;
            D = parseInt(string.substring(6,8), 10);
            H = parseInt(string.substring(8,10), 10);
        } else if (string.length === 12) {
            Y = parseInt(string.substring(0,4), 10);
            M = parseInt(string.substring(4,6), 10) - 1;
            D = parseInt(string.substring(6,8), 10);
            H = parseInt(string.substring(8,10), 10);
            m = parseInt(string.substring(10,12), 10);
        } else if (string.length === 14) {
            Y = parseInt(string.substring(0,4), 10);
            M = parseInt(string.substring(4,6), 10) - 1;
            D = parseInt(string.substring(6,8), 10);
            H = parseInt(string.substring(8,10), 10);
            m = parseInt(string.substring(10,12), 10);
            s = parseInt(string.substring(12,14), 10);
        } else if (string.length === 15 || string.length === 16 || string.length === 17) {
            Y  = parseInt(string.substring(0,4), 10);
            M  = parseInt(string.substring(4,6), 10) - 1;
            D  = parseInt(string.substring(6,8), 10);
            H  = parseInt(string.substring(8,10), 10);
            m  = parseInt(string.substring(10,12), 10);
            s  = parseInt(string.substring(12,14), 10);
            ms = parseInt(string.substring(14,17), 10);
        } else if (string === "0") {
            // handles the case of "0", which parser should convert to the Unix epoch
            Y = 1970;
        } else {
            throw new Error("Incorrect input format for Datetime Value's parse method");
        }
    } else {
        throw new Error("Datetime Value's parse method requires its parameter to be a string");
    }
    return new DatetimeValue(Date.UTC(Y, M, D, H, m, s, ms));
};


DatetimeValue.prototype.toString = function () {
    var Y, M, D, H, m, s, ms;

    Y  = sprintf("%04s", this.value.getUTCFullYear().toString());
    M  = sprintf("%02s", (this.value.getUTCMonth() + 1).toString());
    D  = sprintf("%02s", this.value.getUTCDate().toString());
    H  = sprintf("%02s", this.value.getUTCHours().toString());
    m  = sprintf("%02s", this.value.getUTCMinutes().toString());
    s  = sprintf("%02s", this.value.getUTCSeconds().toString());
    ms = "." + sprintf("%03s", this.value.getUTCMilliseconds().toString());

    if (ms === ".000") {
        ms = "";
    }
    
    return Y + M + D + H + m + s + ms;
};


DatetimeValue.prototype.compareTo = function (x) {
    if (this.getRealValue() < x.getRealValue()) {
        return -1;
    } else if (this.getRealValue() > x.getRealValue()) {
        return 1;
    }
    return 0;
};

DatetimeValue.prototype.addRealValue = function ( realValueIncr ) {
    return new DatetimeValue(this.value.getTime() + realValueIncr);
};

DatetimeValue.prototype.add = function ( /*DataMeasure*/ measure) {
    var date = new DatetimeValue(this.getRealValue());
    switch (measure.unit) {
    case DatetimeUnit.MILLISECOND:
        date.value.setUTCMilliseconds(date.value.getUTCMilliseconds() + measure.measure);
        break;
    case DatetimeUnit.SECOND:
        date.value.setUTCSeconds(date.value.getUTCSeconds() + measure.measure);
        break;
    case DatetimeUnit.MINUTE:
        date.value.setUTCMinutes(date.value.getUTCMinutes() + measure.measure);
        break;
    case DatetimeUnit.HOUR:
        date.value.setUTCHours(date.value.getUTCHours() + measure.measure);
        break;
    case DatetimeUnit.DAY:
        date.value.setUTCDate(date.value.getUTCDate() + measure.measure);
        break;
    case DatetimeUnit.WEEK:
        date.value.setUTCDate(date.value.getUTCDate() + measure.measure * 7);
        break;
    case DatetimeUnit.MONTH:
        date.value.setUTCMonth(date.value.getUTCMonth() + measure.measure);
        break;
    case DatetimeUnit.YEAR:
        date.value.setUTCFullYear(date.value.getUTCFullYear() + measure.measure);
        break;
    }
    return date;
};

DataValue.mixinComparators(DatetimeValue.prototype);

module.exports = DatetimeValue;

},{"../../lib/jermaine/src/jermaine.js":9,"./data_value.js":29,"./datetime_unit.js":35,"sprintf":17}],37:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/**
 * EventEmitter is a Jermaine model that supports basic event emitting /
 * handling for Jermaine objects.
 *
 * Events are represented as plain old JavaScript objects with at least
 * the following two properties:
 *
 *   **type**
 *
 *   > a string giving the type of the event; this can be any
 *     arbitrary string.  The event type is not restricted to be
 *     from some predetermined list; applications are free to
 *     use whatever strings they want for their event types.
 *
 *   **target**
 *
 *   > a reference to the object that emitted the event
 *
 * Event objects may also contain arbitrary other properties that are specific to
 * a particular event type.
 *
 * Any Jermaine model can declare itself to be an event emitter by saying
 * "this.isA(EventEmitter)" in its model declaration.
 *
 * This adds three methods to the model:
 *  
 *   **addListener(eventType, listenerFunction)**
 *
 *   > Registers listenerFunction as a listener for events of type
 *     eventType (a string).  listenerFunction should be a function
 *     that accepts a single argument which will be a reference to an
 *     event object as described above.  When the object emits the
 *     event, the listener function will be invoked in the context
 *     where its "this" keyword refers to the object that emitted the
 *     event (the event target).  If listenerFunction is already
 *     registered as a listener for eventType, this function does
 *     nothing --- each listener function can be registered only once.
 *
 *   **removeListener(eventType, listenerFunction)**
 *
 *   > Removes the given listenerFunction from the list of listeners
 *     for this object for events of type eventType.
 *
 *   **emit(event)**
 *
 *   > Causes the object to emit the given event.  The argument can be
 *     either a string, in which case it is assumed to be an event type
 *     and is converted to an event object with the given 'type'
 *     property, or an event object with a 'type' property and any
 *     other desired properties.  The emit() method automatically adds
 *     a 'target' property to the event object, whose value is a
 *     reference to the object emitting the event.
 *
 * In most cases the emit() method is only called from within the
 * implementation of an EventEmitter object, and code external to the
 * object's model will use its addListener() and removeListener() methods
 * to process events that the object emits.  All three of these methods
 * are public methods, though, so it's also possible for code outside of
 * an object's implementation to cause it to emit an event, or for the
 * object's own code to listen for and process its own events.
 *
 * Two special types of events are always present for every EventEmitter
 * object: the "listenerAdded" and "listenerRemoved" events.  These
 * events make it possible to monitor the addition or removal of event
 * listeners.  The "listenerAdded" event is emitted whenever a new
 * listener function is added, and the "listenerRemoved" event is emitted
 * whenever a listener is removed.  Each of these events contain the
 * following properties:
 *
 *   **targetType**
 *
 *   > the event type associated with the listener
 *     being added or removed
 *
 *   **listener**
 *
 *   > the listener function being added or removed
 *
 * @class EventEmitter
 * @for EventEmitter
 * @constructor
 * @example
 *     var Person = new jermaine.Model(function() {
 *         this.isA(EventEmitter);
 *         this.hasA("name").which.isA("string");
 *         this.respondsTo("say", function(something) {
 *             console.log(this.name() + ' says ' + something);
 *             this.emit({type : "say", message : something});
 *         });
 *     });
 *     var person = new Person().name("Mark");
 *
 *     var sayListener = function(event) {
 *         console.log(event.target.name() + ' said ' + event.message);
 *     };
 *
 *     person.say('Hello');
 *     person.addListener("say", sayListener);
 *     person.say('Alright');
 *     person.removeListener("say", sayListener);
 *     person.say('Goodbye');
 *
 *
 *     OUTPUT:
 *
 *         Mark says Hello
 *         Mark says Alright
 *         Mark said Alright
 *         Mark said Goodbye
 */
var EventEmitter = new jermaine.Model(function () {
    // listeners is a plain old JS object whose keys are events
    // types (strings); the value associated with each key is the
    // list of registered listener functions for that event type.
    this.hasA("listeners").which.defaultsTo( function() {
        // Use a function that returns an empty object as the
        // default value, so we get a new listeners object
        // created for each EventEmitter instance.
        return {};
    });

    /**
     * Adds a listener function for events of a specific type
     * emitted by this object.
     * 
     * @method addListener
     * @param {string} eventType the type of event
     * @param {function} listener a listener function
     * @return {boolean} a value indicating whether the listener
     *         was actually added (a listener is not added if it
     *         is already registered for the eventType)
     */
    this.respondsTo("addListener", function (eventType, listener) {
        var listeners = this.listeners(),
            i;

        if (listeners[eventType] === undefined) {
            listeners[eventType] = [];
        }
        for (i=0; i<listeners[eventType].length; ++i) {
            if (listeners[eventType][i] === listener) {
                return false;
            }
        }
        listeners[eventType].push(listener);
        this.emit({ type       : "listenerAdded",
                    targetType : eventType,
                    listener   : listener});
        return true;
    });

    /**
     * Removes a listener function for events of a specific type
     * emitted by this object.
     * 
     * @method removeListener
     * @param {string} eventType the type of event
     * @param {function} listener the listener function to remove
     * @return {boolean} a value indicating whether the listener
     *         was actually removed.
     */
    this.respondsTo("removeListener", function (eventType, listener) {
        var listeners = this.listeners(),
            i;

        if (listeners[eventType] !== undefined) {
            for (i=0; i<listeners[eventType].length; ++i) {
                if (listeners[eventType][i] === listener) {
                    listeners[eventType][i] = null;
                    this.emit({ type       : "listenerRemoved",
                                targetType : eventType,
                                listener   : listener});
                    return true;
                }
            }
        }
        return false;
    });

    /**
     * Call this objects listeners for a specific event.  If the "event"
     * argument is a string, it is converted to an Object having
     * that string as the value of its "type" attribute; otherwise
     * the "event" argument should be an event Object having a
     * "type" attribute and any other attributes approriate for
     * that event type.  In either case, all (if there are any) of
     * the current listeners on this object for events of the
     * given type will be invoked, being passed an event object.
     * 
     * @method emit
     * @param {Object|string} event either a string representing an event type, or an event
     *                                 object with a 'type' attribute.
     * @return (nothing)
     */
    this.respondsTo("emit", function (event) {
        var listeners,
            i,
            nulls = [];

        if (typeof(event) === "string") {
            event = { type : event };
        }
        if (!event.target) {
            event.target = this;
        }
        if (!event.type) {
            throw new Error("Event object missing 'type' property");
        }

        listeners = this.listeners()[event.type];

        if (!listeners) {
            // no listeners registered for this event type
            return;
        }

        // call all the listeners for this event type, except for
        // nulls, which we keep track of
        for (i = 0; i < listeners.length; i++) {
            if (listeners[i] !== null) {
                listeners[i].call(this, event);
            } else {
                nulls.push(i);
            }
        }

        // remove any nulls from the listeners list; work from the end
        // of the list backwards so that removing an item doesn't change
        // the index of other items to be removed
        if (nulls.length > 0) {
            for (i=nulls.length-1; i>=0; --i) {
                listeners.splice(nulls[i],1);
            }
        }

    });


});

module.exports = EventEmitter;

},{"../../lib/jermaine/src/jermaine.js":9}],38:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var FilterOption = require('./filter_option.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.filter);

var Filter = new jermaine.Model("Filter", function () {
    this.hasMany("options").eachOfWhich.validatesWith(function (option) {
        return option instanceof FilterOption;
    });
    this.hasA("type").which.validatesWith(function (type) {
        return typeof(type) === "string";
    });

    utilityFunctions.insertDefaults(this, defaultValues.plot.filter, attributes);
});

module.exports = Filter;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./filter_option.js":39}],39:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.filter.option);

var FilterOption = new jermaine.Model("FilterOption", function () {
    this.hasA("name").which.validatesWith(function (name) {
        return typeof(name) === "string";
    });
    this.hasA("value").which.validatesWith(function (value) {
        return typeof(value) === "string";
    });

    utilityFunctions.insertDefaults(this, defaultValues.plot.filter.option, attributes);
});

module.exports = FilterOption;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132}],40:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Axis = require('./axis.js'),
    Background = require('./background.js'),
    Data = require('./data.js'),
    Legend = require('./legend.js'),
    Plot = require('./plot.js'),
    Plotarea = require('./plotarea.js'),
    Title = require('./title.js'),
    Window = require('./window.js'),
    Box = require('../math/box.js'),
    DataPlot = require('../core/data_plot.js'),
    AxisBinding = require('../core/axis_binding.js');


/**
 * The Graph Jermaine model controls the properties for an individual Graph.
 *
 * @class Graph
 * @for Graph
 * @constructor
 */
var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues);

var Graph = new jermaine.Model("Graph", function () {
    /**
     * Child model which controls the properties of the Graph's Window.
     *
     * @property window
     * @type {Window}
     * @author jrfrimme
     */
    this.hasA("window").which.validatesWith(function (w) {
        return w instanceof Window;
    });
    /**
     * Child model which controls the properties of the Graph's Plotarea.
     *
     * @property plotarea
     * @type {Plotarea}
     * @author jrfrimme
     */
    this.hasA("plotarea").which.validatesWith(function (plotarea) {
        return plotarea instanceof Plotarea;
    });


    /**
     * Child model which controls the properties of the Graph's Legend.
     *
     * @property legend
     * @type {Legend}
     * @author jrfrimme
     */
    this.hasA("legend").which.validatesWith(function (legend) {
        return legend instanceof Legend;
    });
    /**
     * Child model which controls the properties of the Graph's Background.
     *
     * @property background
     * @type {Background}
     * @author jrfrimme
     */
    this.hasA("background").which.validatesWith(function (background) {
        return background instanceof Background;
    });

    /**
     * Child model which controls the properties of the Graph's Title.
     *
     * @property title
     * @type {Title}
     * @author jrfrimme
     */
    this.hasA("title").which.validatesWith(function (title) {
        return title instanceof Title;
    });
    /**
     * Jermaine Attr_List of the Graph's Axes.
     *
     * @property axes
     * @type {Axis}
     * @author jrfrimme
     */
    this.hasMany("axes").eachOfWhich.validateWith(function (axis) {
        return axis instanceof Axis;
    });
    /**
     * Jermiane Attr_List of the Graph's Plots.
     *
     * @property plots
     * @type {Plot}
     * @author jrfrimme
     */
    this.hasMany("plots").eachOfWhich.validateWith(function (plot) {
        return plot instanceof Plot;
    });
    /**
     * Jermiane Attr_List of the Graph's Data sets.
     *
     * @property data
     * @type {Data}
     * @author jrfrimme
     */
    this.hasMany("data").eachOfWhich.validateWith(function (data) {
        return data instanceof Data;
    });

    /**
     * Stores the computed width and height of the Graph's windowBox.
     *
     * @property windowBox
     * @type {}
     * @author jrfrimme
     */
    this.hasA("windowBox").which.validatesWith(function (val) {
        return val instanceof Box;
    });
    /**
     * Stores the computed width and height of the Graph's paddingBox.
     *
     * @property paddingBox
     * @type {}
     * @author jrfrimme
     */
    this.hasA("paddingBox").which.validatesWith(function (val) {
        return val instanceof Box;
    });
    /**
     * Stores the computed width and height of the Graph's plotBox.
     *
     * @property plotBox
     * @type {}
     * @author jrfrimme
     */
    this.hasA("plotBox").which.validatesWith(function (val) {
        return val instanceof Box;
    });

    /**
     * The containing Multigraph object
     *
     * @property multigraph
     * @type {}
     * @author mbp
     */
    this.hasA("multigraph").which.validatesWith(function (val) {
        //avoid using instanceof, so we don't have to require('multigraph.js') above!!!
        //return val instanceof Multigraph;
        //Just check for busySpinnerLevel function, since that's the part of the
        //multigraph that we use (duck typing).
        return (typeof(val.busySpinnerLevel) == "function");
    });

    this.hasA("x0").which.isA("number");
    this.hasA("y0").which.isA("number");

    this.isBuiltWith(function () {
        this.window( new Window() );
        this.plotarea( new Plotarea() );
        this.background( new Background() );
    });

    this.respondsTo("postParse", function () {
        var i,
            that = this,
            handleAjaxEvent = function(event) {
                if (event.action === 'start') {
                    if (that.multigraph()) {
                        that.multigraph().busySpinnerLevel(1);
                    }
                } else if (event.action === 'complete') {
                    if (that.multigraph()) {
                        that.multigraph().busySpinnerLevel(-1);
                    }
                }
            };

        for (i=0; i<this.data().size(); ++i) {
            this.data().at(i).addListener("ajaxEvent", handleAjaxEvent);
        }
    });

    /**
     * Initializes the Graph's geometry. Determines the width and height of the Graph's `windowBox`,
     * `paddingBox` and `plotBox`; calls its Axes' and Legend's implementations of
     * `initializeGeometry`.
     *
     * @method initializeGeometry
     * @param {Integer} width Width of the multigraph's div
     * @param {Integer} height Height of the multigraph's div
     * @param {Object} graphicsContext
     * @author jrfrimme
     */
    this.respondsTo("initializeGeometry", function (width, height, graphicsContext) {
        var w              = this.window(),
            windowBorder   = w.border(),
            windowMargin   = w.margin(),
            windowPadding  = w.padding(),
            plotarea       = this.plotarea(),
            plotareaBorder = plotarea.border(),
            plotareaMargin = plotarea.margin(),
            i;

        this.windowBox( new Box(width, height) );
        this.paddingBox( new Box(
            ( width -
              ( windowMargin.left()  + windowBorder + windowPadding.left() ) -
              ( windowMargin.right() + windowBorder + windowPadding.right() )
            ),
            ( height -
              ( windowMargin.top()    + windowBorder + windowPadding.top() ) -
              ( windowMargin.bottom() + windowBorder + windowPadding.bottom() )
            )
        )
                       );
        this.plotBox( new Box(
            (
                this.paddingBox().width() -
                    ( plotareaMargin.left() + plotareaMargin.right() + (2 * plotareaBorder))
            ),
            (
                this.paddingBox().height() -
                    ( plotareaMargin.top() + plotareaMargin.bottom() + (2 * plotareaBorder))
            )
        )
                    );
        for (i = 0; i < this.axes().size(); ++i) {
            this.axes().at(i).initializeGeometry(this, graphicsContext);
        }
        if (this.legend()) {
            this.legend().initializeGeometry(this, graphicsContext);
        }
        if (this.title()) {
            this.title().initializeGeometry(graphicsContext);
        }

        this.x0( windowMargin.left()   + windowBorder + windowPadding.left()   + plotareaMargin.left()   + plotareaBorder );
        this.y0( windowMargin.bottom() + windowBorder + windowPadding.bottom() + plotareaMargin.bottom() + plotareaBorder );
    });

    /**
     * Convience function for registering callback functions on the Graph's `Data` models. Adds
     * `dataReady` event listeners to each of the Graph's `Data` models.
     *
     * @method registerCommonDataCallback
     * @param {Function} callback
     * @author jrfrimme
     */
    this.respondsTo("registerCommonDataCallback", function (callback) {
        var i;
        for (i = 0; i < this.data().size(); ++i) {
            this.data().at(i).addListener("dataReady", callback);
        }
    });

    /**
     * 
     *
     * @method pauseAllData
     * @author jrfrimme
     */
    this.respondsTo("pauseAllData", function () {
        var i;
        // pause all this graph's data sources:
        for (i = 0; i < this.data().size(); ++i) {
            this.data().at(i).pause();
        }
    });

    /**
     * 
     *
     * @method resumeAllData
     * @author jrfrimme
     */
    this.respondsTo("resumeAllData", function () {
        var i;
        // resume all this graph's data sources:
        for (i = 0; i < this.data().size(); ++i) {
            this.data().at(i).resume();
        }
    });

    /**
     * 
     *
     * @method findNearestAxis
     * @param {} x
     * @param {} y
     * @param {} orientation
     * @author jrfrimme
     */
    this.respondsTo("findNearestAxis", function (x, y, orientation) {
        var foundAxis = null,
            mindist = 9999,
            axes = this.axes(),
            naxes = this.axes().size(),
            axis,
            i,
            d;
        for (i = 0; i < naxes; ++i) {
            axis = axes.at(i);
            if ((orientation === undefined) ||
                (orientation === null) ||
                (axis.orientation() === orientation)) {
                d = axis.distanceToPoint(x, y);
                if (foundAxis === null || d < mindist) {
                    foundAxis = axis;
                    mindist = d;
                }
            }
        }
        return foundAxis;
    });

    this.respondsTo("axisById", function (id) {
        // return a pointer to the axis for this graph that has the given id, if any
        var axes = this.axes(),
            i;
        for (i = 0; i < axes.size(); ++i) {
            if (axes.at(i).id() === id) {
                return axes.at(i);
            }
        }
        return undefined;
    });

    this.respondsTo("variableById", function (id) {
        // return a pointer to the variable for this graph that has the given id, if any
        var data = this.data(),
            columns,
            i,
            j;
        for (i = 0; i < data.size(); ++i) {
            columns = data.at(i).columns();
            for (j = 0; j < columns.size(); ++j) {
                if (columns.at(j).id() === id) {
                    return columns.at(j);
                }
            }
        }
        return undefined;
    });

    this.respondsTo("normalize", function () {
        var HORIZONTAL = Axis.HORIZONTAL,
            VERTICAL   = Axis.VERTICAL,
            axes  = this.axes(),
            plots = this.plots(),
            i, j,
            haxisCount = 0,
            vaxisCount = 0,
            axis,
            axisid,
            plot;

        //
        // normalizes the data sections
        //
        for (i = 0; i < this.data().size(); i++) {
            this.data().at(i).normalize();
        }

        //
        // Handles missing horizontalaxis and vertical axis tags
        //
        for (i = 0; i < axes.size(); i++) {
            if (axes.at(i).orientation() === HORIZONTAL) {
                haxisCount++;
            } else if (axes.at(i).orientation() === VERTICAL) {
                vaxisCount++;
            }
        }

        if (haxisCount === 0) {
            axes.add(new Axis(HORIZONTAL));
        }
        if (vaxisCount === 0) {
            axes.add(new Axis(VERTICAL));
        }

        //
        // Handles missing id's for axes
        //
        haxisCount = 0;
        vaxisCount = 0;
        for (i = 0; i < axes.size(); i++) {
            axis = axes.at(i);
            if (axis.orientation() === HORIZONTAL) {
                axisid = "x";
                if (haxisCount > 0) {
                    axisid += haxisCount;
                }
                haxisCount++;
            } else if (axis.orientation() === VERTICAL) {
                axisid = "y";
                if (vaxisCount > 0) {
                    axisid += vaxisCount;
                }
                vaxisCount++;
            }

            if (axis.id() === undefined) {
                axis.id(axisid);
            }
        }

        //
        // normalizes the rest of the axis properties
        //
        for (i = 0; i < axes.size(); i++) {
            axes.at(i).normalize(this);
        }

        //
        // handles missing plot tags
        //
        if (plots.size() === 0) {
            plots.add(new DataPlot());
        }

        //
        // normalizes the plots
        //
        for (i = 0; i < plots.size(); i++) {
            plots.at(i).normalize(this);
        }

        //
        // normalizes the legend
        //
        if (this.legend()) {
            this.legend().normalize(this);
        }

        //
        // execute the setDataRange method for each axis binding, to sync up all axes
        // that participate in the binding (this takes care of setting dataMin/dataMax
        // for any axes that don't have them already but which are bound to axes that
        // do have them)
        // 
        AxisBinding.syncAllBindings();

        //
        // arrange to set missing axis min/max values when data is ready, if necessary
        // 
        for (i = 0; i < axes.size(); i++) {
            // for each axis...
            axis = axes.at(i);
            if (!axis.hasDataMin() || !axis.hasDataMax()) {
                // if this axis is mising either a dataMin() or dataMax() value...
                for (j = 0; j < plots.size(); ++j) {
                    // find a DataPlot that references this axis...
                    plot = plots.at(j);
                    if (plot instanceof DataPlot && (plot.horizontalaxis() === axis || plot.verticalaxis() === axis)) {
                        // ... and then register a dataReady listener for this plot's data section which sets the
                        // missing bound(s) on the axis once the data is ready.  Do this inside a closure so that we
                        // can refer to a pointer to our dynamically-defined listener function from inside itself,
                        // so that we can de-register it once it is called; this is done via the the local variable
                        // axisBoundsSetter.  The closure also serves to capture the current values, via arguments,
                        // of the axis pointer, a pointer to the data object, and a boolean (isHorizontal) that
                        // indicates whether the axis is the plot's horizontal or vertical axis.
                        (function (axis, data, isHorizontal) {
                            var axisBoundsSetter = function (event) {
                                var columnNumber = isHorizontal ? 0 : 1,
                                    bounds = data.getBounds(columnNumber),
                                    min = axis.dataMin(),
                                    max = axis.dataMax();
                                if (!axis.hasDataMin()) {
                                    min = bounds[0];
                                }
                                if (!axis.hasDataMax()) {
                                    max = bounds[1];
                                }
                                if (!axis.hasDataMin() || !axis.hasDataMax()) {
                                    axis.setDataRange(min, max);
                                }
                                data.removeListener('dataReady', axisBoundsSetter);
                            };
                            data.addListener('dataReady', axisBoundsSetter);
                        }(axis,                             // axis
                          plot.data(),                      // data
                          plot.horizontalaxis() === axis    // isHorizontal
                         ));
                        break; // for (j=0; j < this.plots().size(); ++j)...
                    }
                }
            }
        }



    });

    utilityFunctions.insertDefaults(this, defaultValues, attributes);
});

module.exports = Graph;

},{"../../lib/jermaine/src/jermaine.js":9,"../core/axis_binding.js":20,"../core/data_plot.js":28,"../math/box.js":99,"../util/utilityFunctions.js":132,"./axis.js":19,"./background.js":22,"./data.js":25,"./legend.js":45,"./plot.js":53,"./plotarea.js":55,"./title.js":64,"./window.js":69}],41:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var RGBColor = require('../math/rgb_color.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.horizontalaxis.grid);

var Grid = new jermaine.Model("Grid", function () {
    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    });
    this.hasA("visible").which.isA("boolean");

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis.grid, attributes);
});

module.exports = Grid;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132}],42:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.legend.icon);

var Icon = new jermaine.Model("Icon", function () {
    this.hasA("height").which.isA("integer");
    this.hasA("width").which.isA("integer");
    this.hasA("border").which.isA("integer");

    utilityFunctions.insertDefaults(this, defaultValues.legend.icon, attributes);
});

module.exports = Icon;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132}],43:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Point = require('../math/point.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.background.img);

var Img = new jermaine.Model("Img", function () {
    this.hasA("src").which.isA("string");
    this.hasA("anchor").which.validatesWith(function (anchor) {
        return anchor instanceof Point;
    });
    this.hasA("base").which.validatesWith(function (base) {
        return base instanceof Point;
    });
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });
    this.hasA("frame").which.validatesWith(function (frame) {
        return frame === Img.PADDING || frame === Img.PLOT;
    });
    this.isBuiltWith("src");

    utilityFunctions.insertDefaults(this, defaultValues.background.img, attributes);
});

Img.PADDING = "padding";
Img.PLOT    = "plot";

module.exports = Img;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/point.js":103,"../util/utilityFunctions.js":132}],44:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataValue = require('./data_value.js'),
    DataFormatter = require('./data_formatter.js'),
    DataMeasure = require('./data_measure.js'),
    Point = require('../math/point.js'),
    RGBColor = require('../math/rgb_color.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.horizontalaxis.labels.label);

var Labeler = new jermaine.Model("Labeler", function () {

    var getValue = function (valueOrFunction) {
        if (typeof(valueOrFunction) === "function") {
            return valueOrFunction();
        } else {
            return valueOrFunction;
        }
    };

    this.hasA("axis").which.validatesWith(function (axis) {
        var Axis = require('./axis.js');
        return axis instanceof Axis;
    });
    this.hasA("formatter").which.validatesWith(DataFormatter.isInstance);
    this.hasA("start").which.validatesWith(DataValue.isInstance);
    this.hasA("angle").which.isA("number");
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });
    this.hasA("anchor").which.validatesWith(function (anchor) {
        return anchor instanceof Point;
    });
    this.hasA("spacing").which.validatesWith(DataMeasure.isInstance);
    this.hasA("densityfactor").which.isA("number").and.which.defaultsTo(1.0);

    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    });

    this.hasA("visible").which.isA("boolean").and.which.defaultsTo(true);

    this.isBuiltWith("axis", function () {
        var labelsDefaults = defaultValues.horizontalaxis.labels;
        if (this.axis().type() === DataValue.DATETIME) {
            this.start( getValue(labelsDefaults['start-datetime']) );
        } else {
            this.start( getValue(labelsDefaults['start-number']) );
        }
    });

    this.respondsTo("initializeGeometry", function (graph) {
        var axis    = this.axis(),
            plotBox = graph.plotBox(),
            labelDefaults = defaultValues.horizontalaxis.labels.label,
            Axis = require('./axis.js');

        if (this.position() === undefined) {
            if (axis.orientation() === Axis.HORIZONTAL) {
                if (axis.perpOffset() > plotBox.height()/2) {
                    this.position( getValue(labelDefaults["position-horizontal-top"]) );
                } else {
                    this.position( getValue(labelDefaults["position-horizontal-bottom"]) );
                }
            } else {
                if (axis.perpOffset() > plotBox.width()/2) {
                    this.position( getValue(labelDefaults["position-vertical-right"]) );
                } else {
                    this.position( getValue(labelDefaults["position-vertical-left"]) );
                }
            }
        }

        if (this.anchor() === undefined) {
            if (axis.orientation() === Axis.HORIZONTAL) {
                if (axis.perpOffset() > plotBox.height()/2) {
                    this.anchor( getValue(labelDefaults["anchor-horizontal-top"]) );
                } else {
                    this.anchor( getValue(labelDefaults["anchor-horizontal-bottom"]) );
                }
            } else {
                if (axis.perpOffset() > plotBox.width()/2) {
                    this.anchor( getValue(labelDefaults["anchor-vertical-right"]) );
                } else {
                    this.anchor( getValue(labelDefaults["anchor-vertical-left"]) );
                }
            }
        }
    });

    this.respondsTo("isEqualExceptForSpacing", function (labeler) {
        // return true iff the given labeler and this labeler are equal in every way
        // except for their spacing values
        return ((this.axis()                         ===   labeler.axis()                            ) &&
                (this.formatter().getFormatString()  ===   labeler.formatter().getFormatString()     ) &&
                (this.start()                        .eq(  labeler.start()                         ) ) &&
                (this.angle()                        ===   labeler.angle()                           ) &&
                (this.position()                     .eq(  labeler.position()                      ) ) &&
                (this.anchor()                       .eq(  labeler.anchor()                        ) ) &&
                (this.densityfactor()                ===   labeler.densityfactor()                   )
               );
    });


    this.hasA("iteratorNextValue").which.validatesWith(DataValue.isInstanceOrNull).and.which.defaultsTo(null);
    this.hasA("iteratorMinValue").which.validatesWith(DataValue.isInstance);
    this.hasA("iteratorMaxValue").which.validatesWith(DataValue.isInstance);

    this.respondsTo("prepare", function (minDataValue, maxDataValue) {
        this.iteratorMinValue(minDataValue);
        this.iteratorMaxValue(maxDataValue);
        this.iteratorNextValue( this.spacing().firstSpacingLocationAtOrAfter(minDataValue, this.start()) );
    });

    this.respondsTo("hasNext", function () {
        var value = this.iteratorNextValue();
        if (value === null || value === undefined) {
            return false;
        }
        return value.le(this.iteratorMaxValue());
    });

    this.respondsTo("peekNext", function () {
        var value    = this.iteratorNextValue(),
            maxValue = this.iteratorMaxValue();
        if (value === null || value === undefined) {
            return undefined;
        }
        if (maxValue !== undefined && value.gt(maxValue)) {
            return undefined;
        }
        return value;
    });

    this.respondsTo("next", function () {
        var value = this.iteratorNextValue(),
            maxValue = this.iteratorMaxValue();
        if (value === null || value === undefined) {
            return undefined;
        }
        if (maxValue !== undefined && value.gt(maxValue)) {
            return undefined;
        }
        this.iteratorNextValue( value.add( this.spacing() ) );
        return value;
    });

    this.respondsTo("getLabelDensity", function (graphicsContext) {
        var axis                      = this.axis(),
            pixelSpacing              = this.spacing().getRealValue() * axis.axisToDataRatio(),
            minRealValue              = axis.dataMin().getRealValue(),
            maxRealValue              = axis.dataMax().getRealValue(),
            representativeRealValue   = minRealValue + 0.51234567 * (maxRealValue - minRealValue),
            representativeValue       = DataValue.create(axis.type(), representativeRealValue ),
            representativeValueString = this.formatter().format(representativeValue),
            Axis                      = require('./axis.js');

        // length of the formatted axis representative value, in pixels
        var pixelFormattedValue = (
            (axis.orientation() === Axis.HORIZONTAL) ?
                this.measureStringWidth(graphicsContext, representativeValueString) :
                this.measureStringHeight(graphicsContext, representativeValueString)
        );
        // return the ratio -- the fraction of the spacing taken up by the formatted string
        return pixelFormattedValue / ( pixelSpacing * this.densityfactor() );
    });


    this.respondsTo("measureStringWidth", function (graphicsContext, string) {
        // Graphics drivers should replace this method with an actual implementation; this
        // is just a placeholder.  The implementation should return the width, in pixels,
        // of the given string.  Of course this is dependent on font choice, size, etc,
        // but we gloss over that at the moment.  Just return the width of the string
        // using some reasonable default font for now.  Later on, we'll modify this
        // function to use font information.
        return string.length*30;
    });
    this.respondsTo("measureStringHeight", function (graphicsContext, string) {
        // see comment for measureStringWidth() above
        return string.length*30;
    });
    this.respondsTo("renderLabel", function (graphicsContext, value) {
        // Graphics drivers should replace this method with an actual implementation; this
        // is just a placeholder.  The implementation should draw the string for the given
        // value, formatted by the labeler's DataFormatter, in the location along the axis
        // determined by the value itself, and the labeler's position, anchor, and angle
        // attributes.
    });

    this.respondsTo("normalize", function () {
        var defaultNumberFormat   = "%.1f",
            defaultDatetimeFormat = "%Y-%M-%D %H:%i",
            labelerFormat,
            type = this.axis().type();

        //
        // Determines default values of labeler attributes based on axis type
        //
        if (type === DataValue.DATETIME) {
            labelerFormat = defaultDatetimeFormat;
        } else {
            labelerFormat = defaultNumberFormat;
        }

        //
        // Inserts labeler defaults
        //
        if (this.formatter() === undefined) {
            this.formatter(DataFormatter.create(type, labelerFormat));
        }

    });

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis.labels.label, attributes);
});

module.exports = Labeler;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/point.js":103,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"./axis.js":19,"./data_formatter.js":26,"./data_measure.js":27,"./data_value.js":29}],45:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Point = require('../math/point.js'),
    RGBColor = require('../math/rgb_color.js'),
    Icon = require('./icon.js'),
    Plot = require('./plot.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    validationFunctions = require('../util/validationFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.legend);

/**
 * Legend is a Jermaine model that supports the rendering of Multigraph Legends.
 * 
 * The methods for this object take a parameter called `graphicsContext`, which is a
 * driver-specific object that stores whatever state/configuration is needed by the
 * driver.  Each driver is responsible for creating its own graphicsContext object and
 * passing it to these methods, which in turn pass that object on to the driver-specific
 * methods that they call.
 * 
 * @class Legend
 * @for Legend
 * @constructor
 * @requires Point,RGBColor,Plot,Icon
 */
var Legend = new jermaine.Model("Legend", function () {
    /**
     * The value which determines if the legend will be rendered; a value of `true` means the Legend will
     * be drawn while `false` means that it will not.
     *
     * @property visible
     * @type {boolean}
     * @author jrfrimme
     */
    this.hasA("visible").which.validatesWith(function (visible) {
        return typeof visible === "boolean" || visible === null;
    });

    /**
     * The value which gives the location of the base point relative to the Legend's frame.
     *
     * @property base
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("base").which.validatesWith(function (base) {
        return base instanceof Point;
    });

    /**
     * The value which gives the location of the Legend's anchor point to be attached to the base point.
     *
     * @property anchor
     * @type {Point}
     * @author jrfrimme
     */
    this.hasAn("anchor").which.validatesWith(function (anchor) {
        return anchor instanceof Point;
    });

    /**
     * A coordinate pair of pixel offsets for the base point.
     *
     * @property position
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });

    /**
     * The value which determines whether the legend is positioned relative to the plot area or the padding
     * box. A value of `plot` means the Legend will be drawn relative to the plot area while `padding` means
     * that it will the padding box.
     *
     * @property frame
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("frame").which.validatesWith(function (frame) {
        return frame === "plot" || frame === "padding";
    });

    /**
     * The value which determines the background color of the Legend.
     *
     * @property color
     * @type {RGBColor}
     * @author jrfrimme
     */
    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    });

    /**
     * The value which determines the bordercolor of the Legend.
     *
     * @property bordercolor
     * @type {RGBColor}
     * @author jrfrimme
     */
    this.hasA("bordercolor").which.validatesWith(function (bordercolor) {
        return bordercolor instanceof RGBColor;
    });

    /**
     * The value which determines the opacity of the Legend; depending on where the Legend is positioned it
     * may obscure parts of the plot data.
     *
     * @property opacity
     * @type {Float}
     * @author jrfrimme
     */
    this.hasA("opacity").which.validatesWith(function (opacity) {
        return validationFunctions.validateNumberRange(opacity, 0.0, 1.0);
    });

    /**
     * The value which determines the thickness of the border drawn around the Legend; a value of `0` turns
     * the border off.
     *
     * @property border
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("border").which.isA("integer");

    /**
     * The value which determines the number of rows to be used for Plot entries in the Legend. If left
     * unspecified then rows will be inserted to account for each Plot entry.
     *
     * @property rows
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("rows").which.isA("integer").and.isGreaterThan(0);

    /**
     * The value which determines the number of columns to be used for Plot entries in the Legend. If rows
     * is set while columns is left unspecified then columns will be inserted to account for each Plot
     * entry.
     *
     * @property columns
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("columns").which.isA("integer").and.isGreaterThan(0);

    /**
     * The value which determines whether the corners of the legend box are rounded when drawn. A value of
     * `0` means that the corners will be drawn square while values greater than `0` mean that the corners
     * are rounded off with circles whose radius in pixels is this value.
     *
     * @property cornerradius
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("cornerradius").which.isA("integer");

    /**
     * The value which determines the pixel width of the padding between the Legend border and its entries.
     *
     * @property padding
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("padding").which.isA("integer");

    /**
     * A optional sub-model which determines the appearance of the Icons for the Plot entries.
     *
     * @property icon
     * @type {Icon}
     * @author jrfrimme
     */
    this.hasAn("icon").which.validatesWith(function (icon) {
        return icon instanceof Icon;
    });

    this.isBuiltWith(function () {
        this.icon( new Icon() );
    });

    /**
     * Pointers to Plot models that have entries in the Legend.
     *
     * @property plots
     * @type {Plot}
     * @author jrfrimme
     */
    this.hasMany("plots").eachOfWhich.validateWith(function (plot) {
        return plot instanceof Plot;
    });

    /**
     * Internal value which determines the number of pixels between an entries icon and its border.
     *
     * @property iconOffset
     * @type {Integer}
     * @default 5
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("iconOffset").which.isAn("integer").and.defaultsTo(5);

    /**
     * Internal value which determines the number of pixels between an entries label and its icon.
     *
     * @property labelOffset
     * @type {Integer}
     * @default 5
     * @private
     * @final
     * @type {}
     * @author jrfrimme
     */
    this.hasA("labelOffset").which.isAn("integer").and.defaultsTo(5);

    /**
     * Internal value which determines the number of pixels between the right end of an entries label and
     * its border
     *
     * @property labelEnding
     * @type {Integer}
     * @default 15
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("labelEnding").which.isAn("integer").defaultsTo(15);

    /**
     * Computed value of the width of the Legend.
     *
     * @property width
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("width").which.isA("number");

    /**
     * Computed value of the height of the Legend.
     *
     * @property height
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("height").which.isA("number");

    /**
     * Computed `x` value of the Legend's lower left corner relative to its frame.
     *
     * @property x
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("x").which.isA("number");

    /**
     * Computed `y` value of the Legend's lower left corner relative to its frame.
     *
     * @property y
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("y").which.isA("number");

    /**
     * Computed width of an individual plot entry.
     *
     * @property blockWidth
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("blockWidth").which.isA("number");

    /**
     * Computed height of an individual plot entry.
     *
     * @property blockHeight
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("blockHeight").which.isA("number");

    /**
     * Computed width of the longest label of all plot entries.
     *
     * @property maxLabelWidth
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("maxLabelWidth").which.isA("number");

    /**
     * Maximum value of the Icon's height and the computed height of the tallest label of all plot entries.
     *
     * @property maxLabelHeight
     * @type {Float}
     * @private
     * @final
     * @author jrfrimme
     */
    this.hasA("maxLabelHeight").which.isA("number");

    this.respondsTo("determineVisibility", function () {
        switch (this.visible()) {
        case true:
            return true;
        case false:
            return false;
        case null:
            if (this.plots().size() > 1) {
                return true;
            } else {
                return false;
            }
        }
    });

    /**
     * Initializes the Legend's geometry. Determines values for the internal attributes `maxLabelWidth`,
     * `maxLabelHeight`, `blockWidth`, `blockHeight`, `width`, `height`, `x` and `y`; these values
     * determine the size and position of the legend and its various internal components, and need
     * to be recomputed whenever the geometry of the containing graph changes;  this method is
     * called by Graph.initializeGeometry().
     * 
     * @method initializeGeometry
     * @chainable
     * @param {Graph} graph Jermaine Graph model
     * @param {Object} graphicsContext driver-specific graphics context object
     * @author jrfrimme
     * @todo Find out whether or not padding needs to be taken into consideration.
     */
    this.respondsTo("initializeGeometry", function (graph, graphicsContext) {
        var anchor     = this.anchor(),
            base       = this.base(),
            position   = this.position(),
            iconOffset = this.iconOffset(),
            widths  = [],
            heights = [],
            label,
            i;

        if (this.determineVisibility() === false) {
            return this;
        }

        for (i = 0; i < this.plots().size(); i++) {
            label = this.plots().at(i).legend().label();
            if (label !== undefined) {
                label.initializeGeometry(graphicsContext);
                widths.push(label.origWidth());
                heights.push(label.origHeight());
            }
        }

        widths.sort(function (a, b) {
            return b - a;
        });
        heights.sort(function (a, b) {
            return b - a;
        });
        this.maxLabelWidth(widths[0]);
        this.maxLabelHeight(Math.max(heights[0], this.icon().height()));

        this.blockWidth(iconOffset + this.icon().width() + this.labelOffset() + this.maxLabelWidth() + this.labelEnding());
        this.blockHeight(iconOffset + this.maxLabelHeight());

        // TODO: find out whether or not padding needs to be taken into consideration
        this.width((2 * this.border()) + (this.columns() * this.blockWidth()));
        this.height((2 * this.border()) + (this.rows() * this.blockHeight()) + iconOffset);

        if (this.frame() === "padding") {
            this.x(((base.x() + 1) * graph.paddingBox().width()/2)  - ((anchor.x() + 1) * this.width()/2)  + position.x());
            this.y(((base.y() + 1) * graph.paddingBox().height()/2) - ((anchor.y() + 1) * this.height()/2) + position.y());
        } else {
            this.x(((base.x() + 1) * graph.plotBox().width()/2)     - ((anchor.x() + 1) * this.width()/2)  + position.x());
            this.y(((base.y() + 1) * graph.plotBox().height()/2)    - ((anchor.y() + 1) * this.height()/2) + position.y());
        }

        return this;
    });

    /**
     * Renders the legend; calls various driver-specific graphics functions to do the
     * actual drawing of the various parts of the legend (background, borders, icons,
     * text).
     * 
     * @method render
     * @chainable
     * 
     * @param {Object} graphicsContext driver-specific graphics context object
     * 
     * @author jrfrimme
     */
    this.respondsTo("render", function (graphicsContext) {
        var plots = this.plots(),
            icon  = this.icon(),
            blockx, blocky,
            iconx, icony,
            labelx, labely,
            plotCount = 0,
            r, c;

        if (this.determineVisibility() === false) {
            return this;
        }

        // perform any neccesary setup
        this.begin(graphicsContext);

        // Draw the legend box
        this.renderLegend(graphicsContext);

        for (r = 0; r < this.rows(); r++) {
            if (plotCount >= plots.size()) {
                break;
            }
            blocky = this.border() + ((this.rows() - r - 1) * this.blockHeight());
            icony  = blocky + this.iconOffset();
            labely = icony;
            for (c = 0; c < this.columns(); c++) {
                if (plotCount >= plots.size()) {
                    break;
                }
                blockx = this.border() + (c * this.blockWidth());
                iconx  = blockx + this.iconOffset();
                labelx = iconx + icon.width() + this.labelOffset();

                // Draw the icon
                plots.at(plotCount).renderer().renderLegendIcon(graphicsContext, iconx, icony, icon, this.opacity());
                
                // Draw the icon border
                if (icon.border() > 0) {
                    icon.renderBorder(graphicsContext, iconx, icony, this.opacity());
                }
                
                // Write the text
                this.renderLabel(plots.at(plotCount).legend().label(), graphicsContext, labelx, labely);

                plotCount++;
            }
        }

        // preform any neccesary steps at the end of rendering
        this.end(graphicsContext);

        return this;
    });

    this.respondsTo("normalize", function (graph) {
        var legendPlots = this.plots(),
            graphPlots  = graph.plots(),
            columns = this.columns,
            rows    = this.rows,
            i, j,
            flag;

        //
        // stores pointers to plots with legends in the Legend object
        //
        for (i = 0; i < graphPlots.size(); i++) {
            // doesn't add a plot if it doesn't have a visible legend
            if (!graphPlots.at(i).legend() || graphPlots.at(i).legend().visible() !== true) {
                continue;
            }

            // doesn't add a plot if it has already been added
            flag = false;
            for (j = 0; j < legendPlots.size(); j++) {
                if (graphPlots.at(i) === legendPlots.at(j)) {
                    flag = true;
                    break;
                }
            }
            if (flag === true) {
                continue;
            }

            legendPlots.add(graphPlots.at(i));
        }

        //
        // If there are no plots in the legend default to 1 row and column if they aren't specified
        //
        if (legendPlots.size() === 0) {
            if (columns() === undefined) {
                columns(1);
            }
            if (rows() === undefined) {
                rows(1);
            }
        }

        //
        // if neither rows nor cols is specified, default to 1 col
        //
        if (rows() === undefined && columns() === undefined) {
            columns(1);
        }

        //
        // if only one of rows/cols is specified, compute the other
        //
        if (columns() === undefined) {
            columns(parseInt(legendPlots.size() / rows() + ( (legendPlots.size() % rows()) > 0 ? 1 : 0 ), 10));
        } else if (rows() === undefined) {
            rows(parseInt(legendPlots.size() / columns() + ( (legendPlots.size() % columns()) > 0 ? 1 : 0 ), 10));
        }

        return this;
    });

    utilityFunctions.insertDefaults(this, defaultValues.legend, attributes);
});

module.exports = Legend;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/point.js":103,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"../util/validationFunctions.js":133,"./icon.js":42,"./plot.js":53}],46:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/**
 * The Mixin model provides a convenient way for Jermaine
 * applications to "mix in" additional functionality to a model,
 * from outside the model's initial definition.
 * 
 * The ability to add features (methods and/or attributes) to a
 * Jermaine model outside its initial definition already exists in
 * Jermaine -- this Mixin model does not actually add new
 * functionality to Jermaine; it just provides a convenient
 * pattern for grouping additional features together and applying
 * them to a model as a group.
 * 
 * The Mixin model maintains an internal list of functions, called
 * mixin functions, and provides an add() method for adding a
 * function to that list.
 * 
 * The apply() method calls all of the mixinfunctions that have been
 * added to the list, passing each one the same arguments
 * that were passed to the apply() function itself.
 * 
 * That's it.  That's all the Mixin class does.  It's up to you to
 * put whatever jermaine-model-extending code you want in the
 * mixin functions you add to the Mixin; the Mixin simply serves
 * as a place to hold them all, and a convenient way to execute
 * them all at once.
 *
 * @class Mixin
 * @for Mixin
 * @author mbp
 */
var Mixin = new jermaine.Model("Mixin", function () {

    /**
     * The internal list of functions to be applied.
     *
     * @property mixinfuncs
     * @private
     * @type {}
     * @author mbp
     */
    this.hasMany("mixinfuncs");

    /**
     * Internal value for tracking whether apply() has been called
     * for this Mixin.
     *
     * @property applied
     * @type {}
     * @private
     * @author mbp
     */
    this.hasA("applied").which.isA("boolean").defaultsTo(false);

    /**
     * Adds a function to this Mixin's mixin list.  Does not check
     * to see if the function is already on the list -- just blindly
     * appends the given function to the list.
     *
     * @method add
     * @param {} func
     * @author mbp
     */
    this.respondsTo("add", function (mixinfunc) {
        this.mixinfuncs().add(mixinfunc);
    });

    /**
     * Call each of this Mixin's mixin functions.  Any
     * arguments passed to apply() will be passed through to each
     * mixin function called.
     * 
     * apply() checks to see whether it has ever been called
     * before for this Mixin, and only executes the mixin
     * functions if this is the first call to apply(); calls to
     * apply() after the first one will have no effect.  (This is
     * true even if additional mixin functions are added after
     * apply() is called; the Mixin maintains a single internal
     * Boolean value that tracks whether apply() has been called.)
     *
     * @method apply
     * @author mbp
     */
    this.respondsTo("apply", function () {
        if (! this.applied()) {
            var i;
            for (i=0; i<this.mixinfuncs().size(); ++i) {
                this.mixinfuncs().at(i).apply(this, arguments);
            }
        }
        this.applied(true);
    });


    /**
     * Just like apply(), but forces the mixin functions to be called
     * regardless of whether apply() was previously called for this
     * Mixin.
     *
     * @method reapply
     * @author mbp
     */
    this.respondsTo("reapply", function () {
        this.applied(false);
        this.apply.apply(this,arguments);
    });


});

module.exports = Mixin;

},{"../../lib/jermaine/src/jermaine.js":9}],47:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
var Multigraph;
module.exports = function($) {
    if (typeof(Multigraph) !== "undefined") { return Multigraph; }

    var jermaine = require('../../lib/jermaine/src/jermaine.js');

    /**
     * The Multigraph Jermaine model is the root class for the js-multigraph project.
     *
     * @class Multigraph
     * @for Multigraph
     * @constructor
     */
    Multigraph = new jermaine.Model("Multigraph", function () {

        /**
         * Jermiane Attr_List of all the graphs in a Multigraph.
         *
         * @property graphs
         * @type {Graph}
         * @author jrfrimme
         */
        this.hasMany("graphs").eachOfWhich.validateWith(function (graph) {
            var Graph = require('./graph.js');
            return graph instanceof Graph;
        });

        /**
         * The div the multigraph is rendered in.
         *
         * @property div
         * @type {HTML Element}
         * @author jrfrimme
         */
        this.hasA("div"); // the actual div element

        /**
         * The url for the mugl file this graph was created from, if any
         *
         * @property mugl
         * @type {string}
         * @author mbp
         */
        this.hasA("mugl");

        /**
         * JavaScript array of ajax throttles; each entry in this array is an
         * object with the following properties:
         *    regex        : regular expression for matching URLs
         *    ajaxthrottle : instance of $.ajaxthrottle
         * 
         * @property ajaxthrottles
         * @type {Array}
         * @author mbp
         */
        this.hasA("ajaxthrottles");

        this.isBuiltWith(function() {
            this.ajaxthrottles([]);
        });

        this.respondsTo("addAjaxThrottle", function (pattern, requests, period, concurrent) {
            this.ajaxthrottles().push({
                regex        : pattern ? new RegExp(pattern) : undefined,
                ajaxthrottle : $.ajaxthrottle({
                    numRequestsPerTimePeriod : parseInt(requests,10),
                    timePeriod               : parseInt(period, 10),
                    maxConcurrent            : parseInt(concurrent, 10)
                })
            });
        });

        this.respondsTo("getAjaxThrottle", function (url) {
            var throttle = undefined;
            $.each(this.ajaxthrottles(), function() {
                if (!this.regex || this.regex.test(url)) {
                    throttle = this.ajaxthrottle;
                    return false;
                }
                return true;
            });
            return throttle;
        });

        /*
         * This function transforms a given URL so that it
         * is relative to the same base as the URL from which the MUGL
         * file was loaded.  If this graph was not created from a MUGL
         * file (either it came from a MUGL string, or was created programmatically),
         * the URL is returned unchanged.
         * 
         * If the URL to be rebased is absolute (contains '://')
         * or root-relative (starts with a '/'), it is returned unchanged.
         * 
         * Otherise, the given URL is relative, and whhat is returned is a
         * new URL obtained by interpreting it relative to the URL
         * from which the MUGL was loaded. 
         */
        this.respondsTo("rebaseUrl", function(url) {
            var baseurl = this.mugl();
            if (! baseurl) {
                return url;
            }
            if (/^\//.test(url)) {
                // url is root-relative (starts with a '/'); return it unmodified
                return url;
            }
            if (/:\/\//.test(url)) {
                // url contains '://', so assume it's a full url, return it unmodified
                return url;
            }
            // convert baseurl to a real base path, by eliminating any url args and
            // everything after the final '/'
            if (!/^\//.test(baseurl)  && !/:\/\//.test(baseurl) && !/^\.\//.test(baseurl)) {
                // first make sure that if baseurl is relative, it starts with './'
                baseurl = './' + baseurl; 
            }
            baseurl = baseurl.replace(/\?.*$/, ''); // remove everything after the first '?'
            baseurl = baseurl.replace(/\/[^\/]*$/, '/'); // remove everything after the last '/'
            return baseurl + url;
        });

        /**
         * The busy spinner
         *
         * @property busySpinner
         * @type {HTML Element}
         * @author mbp
         */
        this.hasA("busySpinner"); // the busy_spinner div

        this.respondsTo("busySpinnerLevel", function (delta) {
            if (this.busySpinner()) {
                $(this.busySpinner()).busy_spinner('level', delta);
            }
        });


        /**
         * Initializes the Multigraph's geometry by calling the `initializeGeometry` function of
         * each of its graph children.
         *
         * @method initializeGeometry
         * @param {Integer} width Width of the multigraph's div.
         * @param {Integer} height Height of the multigraph's div.
         * @param {Object} graphicsContext
         * @author jrfrimme
         */
        this.respondsTo("initializeGeometry", function (width, height, graphicsContext) {
            var i;
            for (i = 0; i < this.graphs().size(); ++i) {
                this.graphs().at(i).initializeGeometry(width, height, graphicsContext);
            }
        });

        /**
         * Convience function for registering callback functions for data becoming ready.
         *
         * @method registerCommonDataCallback
         * @param {Function} callback Callback function to be registered.
         * @author jrfrimme
         */
        this.respondsTo("registerCommonDataCallback", function (callback) {
            var i;
            for (i = 0; i < this.graphs().size(); ++i) {
                this.graphs().at(i).registerCommonDataCallback(callback);
            }
        });

        this.respondsTo("normalize", function () {
            var i;
            for (i = 0; i < this.graphs().size(); ++i) {
                this.graphs().at(i).normalize();
            }
        });


    });

    //    /**
    //     * Determines if the browser supports canvas elements.
    //     *
    //     * @method browserHasCanvasSupport
    //     * @private
    //     * @static
    //     * @author jrfrimme
    //     */
    //    ns.browserHasCanvasSupport = function () {
    //        return (
    //                (!!window.HTMLCanvasElement) &&
    //                (!!window.CanvasRenderingContext2D) &&
    //                (function (elem) {
    //                    return !!(elem.getContext && elem.getContext('2d'));
    //                }(document.createElement('canvas')))
    //            );
    //    };
    //
    //    ns.browserHasSVGSupport = function () {
    //        return !!document.createElementNS &&
    //            !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect;
    //    };

    /**
     * Creates a Multigraph according to specified options. Returns a
     * jQuery `promise` which interacts with the multigraph through its
     * `done` function.
     *
     * @method createGraph
     * @param {Object} options
     *
     * @param {String|HTML Element|jQuery Object} options.div (REQUIRED)
     *      The DOM element div into which the multigraph should be
     *      placed; this value may be either (a) a string which is taken
     *      to be the id attribute of a div in the page, (b) a reference
     *      to the div DOM element itself, or (c) a jQuery object
     *      corresponding to the div DOM element.
     * 
     * @param {URI} options.mugl (REQUIRED, unless muglString is present)
     *       the URL from which the MUGL
     *       file for the Multigraph can be loaded
     * 
     * @param {String} options.muglString (REQUIRED, unless mugl is present)
     *       a string containing the MUGL XML for the graph
     * 
     * @param {String} options.driver (OPTIONAL) Indicates which
     *       graphics driver to use; should be one of the strings
     *       "canvas", "raphael", or "auto".  The default (which is
     *       used if the 'driver' tag is absent) is "auto", which
     *       causes Multigraph to check the features of the browser
     *       it is running in and choose the most appropriate driver.
     * 
     * @param {Function} options.error (OPTIONAL) A function for
     *       displaying error messages to the user.  Multigraph will
     *       call this function if and when it encounters an error.  The
     *       function should receive a single argument which is an
     *       instance of the JavaScript Error object.  The default is to
     *       use Multigraph's own internal mechanism for displaying user
     *       messages.
     *
     * @param {Function} options.warning (OPTIONAL) A function for
     *       displaying warning messages to the user.  Multigraph will
     *       call this function if and when it needs to display a
     *       warning message. The function should receive a single
     *       argument which is an instance of the JavaScript Error
     *       object.  The default is to use Multigraph's own internal
     *       mechanism for displaying user messages.
     * @return {Promise} jQuery promise which provides interaction with
     *     the graph through its `done` function.
     * @author mbp
     */
    Multigraph.createGraph = function (options) {
        var div = options.div,
            messageHandler,
            defaultMessageHandler;

        // // if driver wasn't specified, choose the best based on browser capability
        // if (!options.driver) {
        //     if (ns.browserHasCanvasSupport()) {
        //         options.driver = "canvas";
        //     } else {
        //         options.driver = "raphael";
        //     }
        // }
        // Force canvas driver from now on:
        options.driver = "canvas";

        // if div is a string, assume it's an id, and convert it to the div element itself
        if (typeof(div) === "string") {
            div = $("#" + div)[0];
        }

        // Force the div to have the specific width or height given in the options, if any.
        // I'm adding this code to resolve a problem with the div size sometimes not being
        // available when src/graphics/canvas/multigraph.js:createCanvasGraphFromString()
        // is used; see the notes in that file.
        if (options.width !== undefined && options.width > 0) {
            $(div).width(options.width);
        }
        if (options.height !== undefined && options.height > 0) {
            $(div).height(options.height);
        }

        //
        // NOTE: each of the Multigraph.create{DRIVER}Graph functions below takes an
        // "options" object argument just like Multigraph.createGraph does.  In general this
        // "options" object is the same as the one passed to this Multigraph.createGraph
        // function, but it differs in one way: Instead of containing separate "error" and
        // "warning" properties which are optional, the "options" object passed to the
        // Multigraph.create{DRIVER}Graph functions requires a single (non-optional!)
        // "messageHandler" property, which in turn contains "error" and "warning" properties
        // which are functions for handling errors and warnings, respectively.  Both the
        // "error" and a "warning" properties must be present in the "messageHandler" object
        // and must point to valid functions.
        // 
        // The rationale behind this is to allow convenience for callers of the more "public"
        // Multigraph.createGraph function, so that they don't have to specify an error or
        // warning handler function unless they want to use custom ones.  The internal
        // Multigraph.create{DRIVER}Graph functions, however, always need access to error and
        // warning functions, and often need to pass both of them on to other functions, so
        // they're encapsulated together into a single messageHandler object to make this
        // easier.
        //
        // Build the messageHandler object:
        messageHandler = {};
        if (typeof(options.error) === "function") {
            messageHandler.error = options.error;
        }
        if (typeof(options.warning) === "function") {
            messageHandler.warning = options.warning;
        }

        if (! messageHandler.error  || ! messageHandler.warning) {
            defaultMessageHandler = Multigraph.createDefaultMessageHandlers(div);
            if (! messageHandler.error) {
                messageHandler.error = defaultMessageHandler.error;
            }
            if (! messageHandler.warning) {
                messageHandler.warning = defaultMessageHandler.warning;
            }
        }
        options.messageHandler = messageHandler;

        if (options.muglString !== undefined) {
            // delegate to the driver-specific create function
            if (options.driver === "canvas") {
                return Multigraph.createCanvasGraphFromString(options);
            } else if (options.driver === "raphael") {
                return Multigraph.createRaphaelGraphFromString(options);
            } else {
                options.messageHanlder.error(new Error("invalid graphic driver '" + options.driver + "' specified to Multigraph.createGraph"));
                return undefined;
            }
        }

        // delegate to the driver-specific create function
        if (options.driver === "canvas") {
            return Multigraph.createCanvasGraph(options);
        } else if (options.driver === "raphael") {
            return Multigraph.createRaphaelGraph(options);
        } else {
            options.messageHanlder.error(new Error("invalid graphic driver '" + options.driver + "' specified to Multigraph.createGraph"));
            return undefined;
        }
    };

    /**
     * `window.multigraph.create` is an alias for `window.multigraph.core.Multigraph.createGraph`.
     *
     * @method window.multigraph.create
     * @param {Object} options
     *
     * @param {String|HTML Element|jQuery Object} options.div (REQUIRED)
     *      The DOM element div into which the multigraph should be
     *      placed; this value may be either (a) a string which is taken
     *      to be the id attribute of a div in the page, (b) a reference
     *      to the div DOM element itself, or (c) a jQuery object
     *      corresponding to the div DOM element.
     * 
     * @param {URI} options.mugl (REQUIRED) the URL from which the MUGL
     *       file for the Multigraph can be loaded
     * 
     * @param {String} options.driver (OPTIONAL) Indicates which
     *       graphics driver to use; should be one of the strings
     *       "canvas", "raphael", or "auto".  The default (which is
     *       used if the 'driver' tag is absent) is "auto", which
     *       causes Multigraph to check the features of the browser
     *       it is running in and choose the most appropriate driver.
     * 
     * @param {Function} options.error (OPTIONAL) A function for
     *       displaying error messages to the user.  Multigraph will
     *       call this function if and when it encounters an error.  The
     *       function should receive a single argument which is an
     *       instance of the JavaScrip Error object.  The default is to
     *       use Multigraph's own internal mechanism for displaying user
     *       messages.
     *
     * @param {Function} options.warning (OPTIONAL) A function for
     *       displaying warning messages to the user.  Multigraph will
     *       call this function if and when it needs to display a
     *       warning message. The function should receive a single
     *       argument which is an instance of the JavaScript Error
     *       object.  The default is to use Multigraph's own internal
     *       mechanism for displaying user messages.
     * @return {Promise} jQuery promise which provides interaction with
     *     the graph through its `done` function.
     * @static
     * @author jrfrimme
     */
    Multigraph.create = Multigraph.createGraph;

    /**
     * Creates default error and warning functions for multigraph.
     *
     * @method createDefaultMessageHandlers
     * @param {HTML Element} div
     * @static
     * @return {Object} Object keyed by `error` and `warning` which respectively point to
     *     the generated default error and warning functions.
     * @author jrfrimme
     */
    Multigraph.createDefaultMessageHandlers = function (div) {

        $(div).css('position', 'relative');
        $(div).errorDisplay({});

        return {
            error : function(e) {
                var stackTrace = (e.stack && typeof(e.stack) === "string") ? e.stack.replace(/\n/g, "</li><li>") : e.message;
                $(div).errorDisplay("displayError", stackTrace, e.message, {
                    fontColor       : '#000000',
                    backgroundColor : '#ff0000',
                    indicatorColor  : '#ff0000'
                });
            },

            warning : function (w) {
                // w can be either a string, or a Warning instance
                var message    = "Warning: " + ((typeof(w) === "string") ? w : w.message),
                    stackTrace = (typeof(w) !== "string" && w.stack && typeof(w.stack) === "string") ? w.stack.replace(/\n/g, "</li><li>") : message;
                $(div).errorDisplay("displayError", stackTrace, message, {
                    fontColor       : '#000000',
                    backgroundColor : '#e06a1b',
                    indicatorColor  : '#e06a1b'
                });
            }
        };
    };

    // define empty object for holding data adpaters
    Multigraph._dataAdapters = {};

    Multigraph.installDataAdapter = function(name, adapter) {
        Multigraph._dataAdapters[name] = adapter;
    };

    Multigraph.getDataAdapter = function(name) {
        return Multigraph._dataAdapters[name];
    };

    // so that data adpaters, or other JS code interacting with Multigraph,
    // may have access to sprintf:
    Multigraph.sprintf = require('sprintf');

    return Multigraph;
};

},{"../../lib/jermaine/src/jermaine.js":9,"./graph.js":40,"sprintf":17}],48:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var sprintf = require('sprintf');

var NumberFormatter = function (format) {
    var testString;
    if (typeof(format) !== "string") {
        throw new Error("format must be a string");
    }
    this.formatString = format;
    testString = sprintf(format, 0);
    this.length = testString.length;
};

NumberFormatter.prototype.format = function (value) {
    return sprintf(this.formatString, value.getRealValue());
};

NumberFormatter.prototype.getMaxLength = function () {
    return this.length;
};

NumberFormatter.prototype.getFormatString = function () {
    return this.formatString;
};

module.exports = NumberFormatter;

},{"../../lib/jermaine/src/jermaine.js":9,"sprintf":17}],49:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

NumberValue = require('./number_value.js');

// Fudge factor for floating point comparisons:
var epsilon = 1E-12;

var NumberMeasure = function (measure) {
    this.measure = measure;
};

NumberMeasure.prototype.getRealValue = function () {
    return this.measure;
};

NumberMeasure.prototype.toString = function () {
    return this.measure.toString();
};

NumberMeasure.prototype.firstSpacingLocationAtOrAfter = function (value, alignment)  {
    var f,
        n,
        m,
        a = alignment.value,
        v = value.value,
        s = Math.abs(this.measure);
    f = (v - a) / s;
    n = Math.floor(f);
    m = n + 1;
    //if ((Math.abs(n - f) < epsilon) || (Math.abs(m - f) < epsilon)) {
    //NOTE: by definition of n=floor(f), we know f >= n, so Math.abs(n - f) is the same as (f - n)
    //Also by definition, floor(f)+1 >= f, so Math.abs(m - f) is the same as (m - f)
    if ((f - n < epsilon) || (m - f < epsilon)) {
        return new NumberValue(v);
    }
    return new NumberValue(a + s * m);

};

NumberMeasure.parse = function (s) {
    return new NumberMeasure(parseFloat(s));
};

module.exports = NumberMeasure;

},{"../../lib/jermaine/src/jermaine.js":9,"./number_value.js":50}],50:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

DataValue = require('./data_value.js');

var NumberValue = function (value) {
    this.value = value;
};

NumberValue.prototype.getRealValue = function () {
    return this.value;
};

NumberValue.prototype.toString = function () {
    return this.value.toString();
};

NumberValue.prototype.compareTo = function (x) {
    if (this.value < x.value) {
        return -1;
    } else if (this.value > x.value) {
        return 1;
    }
    return 0;
};

NumberValue.prototype.addRealValue = function ( realValueIncr ) {
    return new NumberValue(this.value + realValueIncr);
};

NumberValue.prototype.add = function (/*DataMeasure*/ measure) {
    // NOTE: deliberately accessing the 'measure' property of a NumberMeasure here, rather
    // than calling its getRealValue() method, for convenience and efficiency:
    return new NumberValue(this.value + measure.measure);
};

NumberValue.prototype.type = DataValue.NUMBER;

NumberValue.prototype.clone = function() {
    return new NumberValue(this.value);
};

NumberValue.parse = function (s) {
    return new NumberValue(parseFloat(s));
};

DataValue.mixinComparators(NumberValue.prototype);

module.exports = NumberValue;

},{"../../lib/jermaine/src/jermaine.js":9,"./data_value.js":29}],51:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

DataValue = require('./data_value.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.horizontalaxis.pan);

var Pan = new jermaine.Model("Pan", function () {
    this.hasA("allowed").which.isA("boolean");
    this.hasA("min").which.validatesWith(DataValue.isInstanceOrNull);
    this.hasA("max").which.validatesWith(DataValue.isInstanceOrNull);

    //NOTE: the distinction between DataValue and DataMeasure for the zoom & pan model
    //      attributes might seem confusing, so here's a table to clarify it:
    //
    //              Boolean      DataValue      DataMeasure
    //              -------      ---------      -----------
    //  zoom:       allowed      anchor         min,max
    //   pan:       allowed      min,max

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis.pan, attributes);
});

module.exports = Pan;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./data_value.js":29}],52:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var ArrayData = require('./array_data.js'),
    DataMeasure = require('./data_measure.js'),
    DataValue = require('./data_value.js');

var PeriodicArrayData = new jermaine.Model(function () {
    var PeriodicArrayData = this,
        emptyIterator = {
            "next"    : function () {},
            "hasNext" : function () { return false; }
        };

    this.isA(ArrayData);
    this.hasA("period").which.validatesWith(DataMeasure.isInstance);
    //this.hasA("column0RelativeRealValues").which.defaultsTo(null);
    this.isBuiltWith("columns", "stringArray", "period", function () {
        this.init();
        this.addListener("listenerAdded", function (event) {
            var data = this.array();
            if (event.targetType === "dataReady") {
                event.listener(data[0][0], data[data.length-1][0]);
            }
        });
    });

    /*
     this.respondsTo("initializeColumn0RelativeRealValues", function() {
     var array = this.array(),
     column0RelativeRealValues = [],
     i;
     for (i=0; i<array.length; ++i) {
     column0RelativeRealValues[i] = array[i][0] - array[0][0];
     }
     this.column0RelativeRealValues(column0RelativeRealValues);
     });
     */

    /**
     * @method getIterator
     * @param {string array} columnIDs
     * @param {DataValue} min
     * @param {DataValue} max
     * @param {Integer} buffer
     * @author jrfrimme
     */
    this.respondsTo("getIterator", function (columnIds, min, max, buffer) {
        return PeriodicArrayData.getArrayDataIterator(this, columnIds, min, max, buffer);
    });

    /**
     * @method getArrayDataIterator
     * @static
     * @param {ArrayData} arrayData
     * @param {string array} columnIDs
     * @param {DataValue} min
     * @param {DataValue} max
     * @param {Integer} buffer
     * @return iter
     * @author jrfrimme
     */
    PeriodicArrayData.getArrayDataIterator = function (periodicArrayData, columnIds, min, max, buffer) {
        var iter = {},
            arraySlice = [],
            curr = 0,
            i, j,
            currentIndex,
            columnIndices,
            array = periodicArrayData.array();

        buffer = buffer || 0;

        // columnIds argument should be an array of strings
        if (Object.prototype.toString.apply(columnIds) !== "[object Array]") {
            throw new Error("ArrayData: getIterator method requires that the first parameter be an array of strings");
        } else {
            for (i = 0; i < columnIds.length; ++i) {
                if (typeof(columnIds[i]) !== "string") {
                    throw new Error("ArrayData: getIterator method requires that the first parameter be an array of strings");
                }
            }
        }

        //min,max arguments should be data values
        if (!DataValue.isInstance(min) || !DataValue.isInstance(max)) {
            throw new Error("ArrayData: getIterator method requires the second and third argument to be number values");
        }

        //buffer argument should be an integer
        if (typeof(buffer) !== "number") {
            throw new Error("ArrayData: getIterator method requires last argument to be an integer");
        }

        // if we have no data, return an empty iterator
        if (array.length === 0) {
            return emptyIterator;
        }

        /*
         // populate the column0RelativeRealValues array if it hasn't yet been populated
         if (this.column0RelativeRealValues() === null) {
         this.initializeColumn0RelativeRealValues();
         }
         */

        // Let `baseValue` be the location of the first data point in the array
        var baseValue = array[0][0];

        // In the regular lattice of spacing `period` aligned with baseValue,
        // find the last point that is less than or equal to `min`.  Call this point `b`.
        var b = periodicArrayData.period().lastSpacingLocationAtOrBefore(min, baseValue);

        // Let `offsetRealValue` be the difference between b and baseValue, as a real value:
        var offsetRealValue = b.getRealValue() - baseValue.getRealValue();

        // Let `baseMin` be `min` shifted 'backward' by offsetRealValue; this is `min`
        // relative to the same period cycle as baseValue:
        var baseMin = DataValue.create(min.type, min.getRealValue() - offsetRealValue);

        // find the index of the first row in the array whose column0 value is >= baseMin;
        // this is the data point we start with
        for (currentIndex = 0; currentIndex < array.length; ++currentIndex) {
            if (array[currentIndex][0].ge(baseMin)) {
                break;
            }
        }
        if (currentIndex === array.length) {
            return emptyIterator;
        }

        //
        //TODO later: back up 'buffer' steps
        //

        // set the current value to be the column0 value at this first index, shifted
        // 'forward' by offsetRealValue
        var currentValue = DataValue.create(array[currentIndex][0].type, array[currentIndex][0].getRealValue() + offsetRealValue);

        columnIndices = [];
        for (j = 0; j < columnIds.length; ++j) {
            var k = periodicArrayData.columnIdToColumnNumber(columnIds[j]);
            columnIndices.push( k );
        }

        return {
            next : function () {
                var projection = [],
                    i, x;
                if (currentIndex < 0) {
                    return null;
                }
                for (i = 0; i < columnIndices.length; ++i) {
                    if (columnIndices[i] === 0) {
                        projection.push(currentValue);
                    } else {
                        projection.push(array[currentIndex][columnIndices[i]]);
                    }
                }
                ++currentIndex;
                if (currentIndex >= array.length) {
                    currentIndex = 0;
                    b = b.add(periodicArrayData.period());
                    offsetRealValue = b.getRealValue() - baseValue.getRealValue();
                }
                currentValue = DataValue.create(array[currentIndex][0].type, array[currentIndex][0].getRealValue() + offsetRealValue);
                if (currentValue.gt(max)) {
                    //TODO: actually need to figure out how to move forward `buffer` steps, but for
                    // now skip that part.
                    currentIndex = -1;
                }
                return projection;
            },
            hasNext : function () {
                return (currentIndex >= 0);
            }
        };
        
    };

});


module.exports = PeriodicArrayData;

},{"../../lib/jermaine/src/jermaine.js":9,"./array_data.js":18,"./data_measure.js":27,"./data_value.js":29}],53:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var PlotLegend = require('./plot_legend.js'),
    Axis = require('./axis.js'),
    Renderer = require('./renderer.js');

var Plot = new jermaine.Model("Plot", function () {
    this.hasA("legend").which.validatesWith(function (legend) {
        return legend instanceof PlotLegend;
    });
    this.hasA("horizontalaxis").which.validatesWith(function (axis) {
        return axis instanceof Axis;
    });
    this.hasA("verticalaxis").which.validatesWith(function (axis) {
        return axis instanceof Axis;
    });
    this.hasA("renderer").which.validatesWith(function (renderer) {
        return renderer instanceof Renderer;
    });

    this.respondsTo("normalize", function(graph) {
        var graphAxes = graph.axes(),
            rendererType,
            numberOfVariables,
            findNextVariableAtOrAfter,
            i,
            DataPlot = require('../core/data_plot.js');

        //
        // Handles missing variables
        //
        findNextVariableAtOrAfter = function (plot, data, index) {
            var overlapFlag = false,
                variableInPlotFlag,
                i = index,
                j,
                variable;

            while (true) {
                if (i === index && overlapFlag === true) {
                    throw new Error("Plot Normalizer: There does not exist an unused variable");
                }

                if (i === data.columns().size()) {
                    i = 0;
                    overlapFlag = true;
                }

                variableInPlotFlag = false;
                variable = data.columns().at(i);

                for (j = 0; j < plot.variable().size(); j++) {
                    if (plot.variable().at(j) === variable) {
                        variableInPlotFlag = true;
                        break;
                    }
                }

                if (variableInPlotFlag === false) {
                    return variable;
                }

                i++;
            }
            
        };

        //
        // Handles missing horizontalaxis tags
        //
        if (this.horizontalaxis() === undefined) {
            for (i = 0; i < graphAxes.size(); i++) {
                if (graphAxes.at(i).orientation() === Axis.HORIZONTAL) {
                    this.horizontalaxis(graphAxes.at(i));
                    break;
                }
            }
        }

        //
        // Handles missing verticalaxis tags
        //
        if (this.verticalaxis() === undefined) {
            for (i = 0; i < graphAxes.size(); i++) {
                if (graphAxes.at(i).orientation() === Axis.VERTICAL) {
                    this.verticalaxis(graphAxes.at(i));
                    break;
                }
            }
        }

        //
        // Handles missing renderer tags
        //
        if (this.renderer() === undefined) {
            require('./renderers/all_renderers.js');
            rendererType = Renderer.Type.parse("line");
            this.renderer(Renderer.create(rendererType));
            this.renderer().plot(this);
        }

        numberOfVariables = this.renderer().numberOfVariables();

        if (this instanceof DataPlot) {
            var plotData = this.data,
                plotVariables = this.variable();
            
            if (plotData() === undefined) {
                plotData(graph.data().at(0));
            }

            if (plotVariables.size() === 0) {
                plotVariables.add(findNextVariableAtOrAfter(this, plotData(), 0));
            }

            if (plotVariables.at(0) === null) {
                plotVariables.replace(0, findNextVariableAtOrAfter(this, plotData(), 0));
            }

            while (plotVariables.size() < numberOfVariables) {
                plotVariables.add(findNextVariableAtOrAfter(this, plotData(), 1));
            }

            // 1. get variables from a data section, some will be used, others won't be.
            // 2. check if horizontal axis needs a variable
            //       if it does - find first unused variable, starting at position 0
            //                  - if no unused variables exist - throw error
            //                  - CONTINUE
            //       if it does not - CONTINUE
            // 3. check if vertical axis needs variable(s)
            //       if it does - find first unused variable, starting at the position of
            //                    the x variable
            //                  - if no unused variables exist - throw error
            //                  - check if vertical axis needs another variable
            //                        if it does - Repeat step 3
        }

    });

});

module.exports = Plot;

},{"../../lib/jermaine/src/jermaine.js":9,"../core/data_plot.js":28,"./axis.js":19,"./plot_legend.js":54,"./renderer.js":56,"./renderers/all_renderers.js":57}],54:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Text = require('./text.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.legend);

var PlotLegend = new jermaine.Model("PlotLegend", function () {
    this.hasA("visible").which.isA("boolean");
    this.hasA("label").which.validatesWith(function (label) {
        return label instanceof Text;
    });

    utilityFunctions.insertDefaults(this, defaultValues.plot.legend, attributes);
});

module.exports = PlotLegend;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./text.js":63}],55:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var RGBColor = require('../math/rgb_color.js'),
    Insets = require('../math/insets.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plotarea);

var Plotarea = new jermaine.Model("Plotarea", function () {

    this.hasA("margin").which.validatesWith(function (margin) {
        return margin instanceof Insets;
    });

    this.hasA("border").which.isA("integer");

    this.hasA("color").which.validatesWith(function (color) {
        return color === null || color instanceof RGBColor;
    });

    this.hasA("bordercolor").which.validatesWith(function (bordercolor) {
        return bordercolor instanceof RGBColor;
    });

    utilityFunctions.insertDefaults(this, defaultValues.plotarea, attributes);
});

module.exports = Plotarea;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/insets.js":102,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132}],56:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Warning = require('./warning.js'),
    Enum = require('../math/enum.js'),
    rendererList,
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer),
    Type = new Enum("RendererType"),
    RGBColor = require('../math/rgb_color.js');

var Renderer = new jermaine.Model("Renderer", function () {
    this.hasA("type").which.validatesWith(Type.isInstance);
    this.hasA("plot").which.validatesWith(function (plot) {
        var Plot = require('./plot.js');
        return plot instanceof Plot;
    });
    this.hasA("numberOfVariables").which.isA("number");

    this.respondsTo("setUpMissing", function () {
        // A call to this method results in the addition (or replacement) of a method called "isMissing()"
        // that can be used to test whether a value meets the "missing" criteria of one of this renderer's
        // plot's data columns.  The point of having this "setUpMissing()" method create the "isMissing()"
        // method, rather than just coding the "isMissing()" method directly here, is so that we can capture
        // a pointer to the plot's data object via a closure, for faster access, rather than coding
        // this.plot().data() in "isMissing()", which adds the overhead of 2 getter calls to each invocation.
        //
        // NOTE: This is awkward.  What we really want is for this stuff to happen automatically when
        // the renderer's "plot" attribute is set.  Can Jermaine be modified to allow us to write
        // a custom setter, so that we can execute this code automatically when the render's "plot"
        // attribute is set ???
        var plot = this.plot(),
            data;
        if (!plot) {
            console.log("Warning: renderer.setUpMissing() called for renderer that has no plot ref");
            // this should really eventually throw an error
            return;
        }

        // for ConstantPlot, create function that always returns false, since it has no data
        var ConstantPlot = require('./constant_plot.js');
        if (plot instanceof ConstantPlot) {
            this.isMissing = function (p) {
                return false;
            };
            return;
        }


        if (!plot.data()) {
            // this should eventually throw an error
            console.log("Warning: renderer.setUpMissing() called for renderer whose plot has no data ref");
            return;
        }
        data = plot.data();
        this.isMissing = function (p) {
            var i;
            for (i = 1; i < p.length; ++i) {
                if (data.isMissing(p[i], i)) {
                    return true;
                }
            }
            return false;
        };
    });

    this.isBuiltWith("type");

    utilityFunctions.insertDefaults(this, defaultValues.plot.renderer, attributes);

    this.respondsTo("transformPoint", function (input) {
        var output = [],
            haxis = this.plot().horizontalaxis(),
            vaxis = this.plot().verticalaxis(),
            i;

        output[0] = haxis.dataValueToAxisValue(input[0]);
        for (i = 1; i < input.length; ++i) {
            output[i] = vaxis.dataValueToAxisValue(input[i]);
        }
        return output;
    });

    var equalOrUndefined = function (a, b) {
        return ((a===b) || ((a===undefined) && (b===undefined)));
    };

    this.respondsTo("setOption", function (name, value, min, max) {
        var rendererOpt,
            rendererOpts,
            i;
        if (!this.optionsMetadata[name]) {
            throw new Error("attempt to set unknown renderer option '"+name+"'");
        }
        rendererOpts = this.options()[name]();
        for (i = 0; i < rendererOpts.size(); ++i) {
            if (equalOrUndefined(rendererOpts.at(i).min(), min) &&
                equalOrUndefined(rendererOpts.at(i).max(), max)) {
                rendererOpts.at(i).value(value);
                return;
            }
        }
        // If we get this far, it means we didn't find an existing option in the list with matching min/max
        // settings, so we create a new one and append it to the end of the list:
        rendererOpt = new (this.optionsMetadata[name].type)();
        rendererOpt.value(value);
        rendererOpt.min(min);
        rendererOpt.max(max);
        rendererOpts.add(rendererOpt);
    });

    this.respondsTo("setOptionFromString", function (name, stringValue, stringMin, stringMax) {
        var plot = this.plot(),
            type = this.type(),
            DataValue = require('./data_value.js');

        //
        // Two blocks of code below provides support for the deprecated "dotsize" and "dotcolor"
        // options, which have been replaced by "pointsize" and "pointcolor".  Delete these blocks
        // when removing support for this.
        // 

        // 
        // First block in support of deprecated dotsize/dotcolor options:
        //
        var warning = undefined;
        if (name === "dotsize") {
            name = "pointsize";
            warning = new Warning('deprecated "dotsize" option used for "' + type + '" renderer; use "pointsize" instead');
        } else if (name === "dotcolor") {
            name = "pointcolor";
            warning = new Warning('deprecated "dotcolor" option used for "' + type + '" renderer; use "pointcolor" instead');
        }
        // 
        // End of first block in support of deprecated dotsize/dotcolor options
        //

        var rendererOpt;
        if (!this.optionsMetadata[name]) {
            // If this renderer has no option named "name", bail out immediately.  This should eventually
            // throw an error, but for now we just quietly ignore it, to eliminate error conditions coming
            // from unimplemented options.
            //console.log("WARNING: renderer has no option named '" + name + "'");
            throw new Warning('"' + type + '"' + ' renderer has no option named "' + name + '"');
        }
        rendererOpt = new (this.optionsMetadata[name].type)();
        rendererOpt.parseValue(stringValue, this);
        if (plot && plot.verticalaxis()) {
            if (stringMin !== undefined) {
                rendererOpt.min( DataValue.parse( plot.verticalaxis().type(), stringMin ));
            }
            if (stringMax !== undefined) {
                rendererOpt.max( DataValue.parse( plot.verticalaxis().type(), stringMax ));
            }
        }
        this.setOption(name, rendererOpt.value(), rendererOpt.min(), rendererOpt.max());

        // 
        // Second block in support of deprecated dotsize/dotcolor options:
        //
        if (warning) {
            throw warning;
        }
        // 
        // End of second block in support of deprecated dotsize/dotcolor options:
        //
    });


    this.respondsTo("getOptionValue", function (optionName, /*optional:*/value) {
        var i,
            options,
            optionList;

        options = this.options();
        if (typeof(options[optionName]) !== "function") {
            throw new Error('unknown option "'+optionName+'"');
        }
        optionList = options[optionName]();
        if (!optionList) {
            throw new Error('unknown option "'+optionName+'"');
        }
        //NOTE: options are stored in reverse order; default one is always in the '0' position.
        //  Search through them starting at the END of the list, going backwards!
        for (i = optionList.size()-1; i >= 0; --i) {
            var option = optionList.at(i);
            if (((option.min()===undefined) || (value===undefined) || option.min().le(value)) &&
                ((option.max()===undefined) || (value===undefined) || option.max().gt(value))) {
                return option.value();
            }
        }
        
    });

    // method must be overridden by subclass:
    this.respondsTo("begin", function () {
    });
    // method must be overridden by subclass:
    this.respondsTo("dataPoint", function (point) {
    });
    // method must be overridden by subclass:
    this.respondsTo("end", function () {
    });

});

/*
 * Private list of known renderers.  This list is populated from within individual
 * renderer submodel implementations by calls to Renderer.addType.
 */
rendererList = [];

/*
 * Add a renderer submodel to the list of known renders.  rendererObj should be
 * an object with two properties:
 *    'type'  : the type of the renderer -- a string, which is the value expected
 *              for the type attribute of the mugl <renderer> tag.
 *    'model' : the renderer submodel
 */
Renderer.addType = function (rendererObj) {
    rendererList.push(rendererObj);
};

/*
 * Factory method: create an instance of a renderer submodel based on its type (a string).
 */
Renderer.create = function (type) {
    var i,
        renderer;
    for (i = 0; i < rendererList.length; ++i) {
        if (rendererList[i].type === type) {
            renderer = new (rendererList[i].model)();
            renderer.type(type);
            return renderer;
        }
    }
    throw new Error("Renderer.create: '" + type + "' is not a known renderer type");
    //        throw new Error('Renderer.create: attempt to create a renderer of unknown type');
};

Renderer.declareOptions = function (renderer, OptionsModelName, options) {
    var i,
        OptionsModel,
        optionsMetadata,
        declareOption = function(optionName, optionType) {
            // NOTE: this call to hasMany() has to be in a function here, rather than just
            // being written inline where it is used below, because we need a closure to
            // capture value of options[i].type as optionType, for use in the validation
            // function.  Otherwise, the validator captures the 'options' array and the
            // local loop variable i instead, and evaluates options[i].type when validation
            // is performed!
            OptionsModel.hasMany(optionName).eachOfWhich.validateWith(function (v) {
                return v instanceof optionType;
            });
        };

    OptionsModel    = new jermaine.Model(OptionsModelName, function () {});
    optionsMetadata = {};
    for (i = 0; i < options.length; ++i) {
        declareOption(options[i].name, options[i].type);
        optionsMetadata[options[i].name] = {
            "type"    : options[i].type,
            "default" : options[i]["default"]
        };
    }
    renderer.hasA("options").isImmutable().defaultsTo(function () { return new OptionsModel(); });
    renderer.prototype.optionsMetadata = optionsMetadata;

    renderer.isBuiltWith(function () {
        // populate options with default values stored in options metadata (which was populated by declareOptions):
        var optionsMetadata = this.optionsMetadata,
            opt, ropt;
        for (opt in optionsMetadata) {
            if (optionsMetadata.hasOwnProperty(opt)) {
                ropt = new (optionsMetadata[opt].type)(optionsMetadata[opt]["default"]);
                this.options()[opt]().add( ropt );
            }
        }
    });

};


Renderer.Option = new jermaine.Model("Renderer.Option", function () {
    var DataValue = require('./data_value.js');
    this.hasA("min").which.validatesWith(DataValue.isInstance);
    this.hasA("max").which.validatesWith(DataValue.isInstance);
});


Renderer.RGBColorOption = new jermaine.Model("Renderer.RGBColorOption", function () {
    this.isA(Renderer.Option);
    this.hasA("value").which.validatesWith(function (v) {
        return v instanceof RGBColor || v === null;
    });
    this.isBuiltWith("value");
    this.respondsTo("serializeValue", function () {
        return this.value().getHexString();
    });
    this.respondsTo("parseValue", function (string) {
        this.value( RGBColor.parse(string) );
    });
    this.respondsTo("valueEq", function (value) {
        return this.value().eq(value);
    });

});

Renderer.NumberOption = new jermaine.Model("Renderer.NumberOption", function () {
    this.isA(Renderer.Option);
    this.hasA("value").which.isA("number");
    this.isBuiltWith("value");
    this.respondsTo("serializeValue", function () {
        return this.value().toString();
    });
    this.respondsTo("parseValue", function (string) {
        this.value( parseFloat(string) );
    });
    this.respondsTo("valueEq", function (value) {
        return (this.value()===value);
    });
});

Renderer.DataValueOption = new jermaine.Model("Renderer.DataValueOption", function () {
    this.isA(Renderer.Option);
    this.hasA("value").which.validatesWith(function (value) {
        var DataValue = require('./data_value.js');
        return DataValue.isInstance(value) || value === null;
    });
    this.isBuiltWith("value");
    this.respondsTo("serializeValue", function () {
        return this.value();
    });
    this.respondsTo("valueEq", function (value) {
        return this.value().eq(value);
    });
});

Renderer.VerticalDataValueOption = new jermaine.Model("Renderer.DataValueOption", function () {
    this.isA(Renderer.DataValueOption);
    this.isBuiltWith("value");
    this.respondsTo("parseValue", function (string, renderer) {
        var DataValue = require('./data_value.js');
        this.value( DataValue.parse(renderer.plot().verticalaxis().type(), string) );
    });
    
});

Renderer.HorizontalDataValueOption = new jermaine.Model("Renderer.DataValueOption", function () {
    this.isA(Renderer.DataValueOption);
    this.isBuiltWith("value");
    this.respondsTo("parseValue", function (string, renderer) {
        var DataValue = require('./data_value.js');
        this.value( DataValue.parse(renderer.plot().horizontalaxis().type(), string) );
    });
    
});

Renderer.DataMeasureOption = new jermaine.Model("Renderer.DataMeasureOption", function () {
    this.isA(Renderer.Option);
    this.hasA("value").which.validatesWith(function (value) {
        var DataMeasure = require('./data_measure.js');
        return DataMeasure.isInstance(value) || value === null;
    });
    this.isBuiltWith("value");
    this.respondsTo("serializeValue", function () {
        return this.value();
    });
    this.respondsTo("valueEq", function (value) {
        return this.value().eq(value);
    });
});

Renderer.VerticalDataMeasureOption = new jermaine.Model("Renderer.DataMeasureOption", function () {
    this.isA(Renderer.DataMeasureOption);
    this.respondsTo("parseValue", function (string, renderer) {
        var DataMeasure = require('./data_measure.js');
        this.value( DataMeasure.parse(renderer.plot().verticalaxis().type(), string) );
    });
    
});

Renderer.HorizontalDataMeasureOption = new jermaine.Model("Renderer.DataMeasureOption", function () {
    this.isA(Renderer.DataMeasureOption);
    this.isBuiltWith("value");
    this.respondsTo("parseValue", function (string, renderer) {
        var DataMeasure = require('./data_measure.js');
        this.value( DataMeasure.parse(renderer.plot().horizontalaxis().type(), string) );
    });
    
});

Renderer.Type = Type;

module.exports = Renderer;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/enum.js":101,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"./constant_plot.js":23,"./data_measure.js":27,"./data_value.js":29,"./plot.js":53,"./warning.js":65}],57:[function(require,module,exports){
require('./band_renderer.js');
require('./bar_renderer.js');
require('./fill_renderer.js');
require('./pointline_renderer.js');
require('./rangebar_renderer.js');

},{"./band_renderer.js":58,"./bar_renderer.js":59,"./fill_renderer.js":60,"./pointline_renderer.js":61,"./rangebar_renderer.js":62}],58:[function(require,module,exports){
var jermaine = require('../../../lib/jermaine/src/jermaine.js');

// The Band renderer is a 2-variable renderer which fills the region
// between two data lines with a solid color, and draws a line segment
// between consecutive data points in each line.
// 
// It is very similar to the fill renderer except that the filled region
// extends between the two (vertical axis) data values at each data point, instead
// of between a single (vertical axis) value and a horizontal base line.
// 
// The line segements should occlude the solid fill.
// 
// This renderer accepts the following options:
// 
//     OPTION NAME:          linecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          Color used for line segments.
// 
//     OPTION NAME:          linewidth
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Width, in pixels, of line segments.  A
//                           value of 0 means do not draw line segments.
// 
//     OPTION NAME:          line1color
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        none (linecolor is used)
//     DESCRIPTION:          Color used for line segments connecting the
//                           values of variable 1.   If both linecolor and
//                           line1color are specified, line1color is used.
// 
//     OPTION NAME:          line1width
//     DATA TYPE:            number
//     DEFAULT VALUE:        -1 (linewidth is used)
//     DESCRIPTION:          Width, in pixels, of line segments connecting the
//                           values of variable 1.  A value of 0 means do not
//                           draw line segments.   If both linewidth and
//                           line1width are specified, line1width is used.
// 
//     OPTION NAME:          line2color
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        none (linecolor is used)
//     DESCRIPTION:          Color used for line segments connecting the
//                           values of variable 2.   If both linecolor and
//                           line2color are specified, line2color is used.
// 
//     OPTION NAME:          line2width
//     DATA TYPE:            number
//     DEFAULT VALUE:        -1 (linewidth is used)
//     DESCRIPTION:          Width, in pixels, of line segments connecting the
//                           values of variable 2.  A value of 0 means do not
//                           draw line segments.   If both linewidth and
//                           line2width are specified, line2width is used.
// 
//     OPTION NAME:          fillcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x808080 (dark gray)
//     DESCRIPTION:          Color used for the fill area.
// 
//     OPTION NAME:          fillopacity
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Opacity used for the fill area.
//

var Renderer = require('../renderer.js'),
    RGBColor = require('../../math/rgb_color.js');

var BandRenderer = new jermaine.Model("BandRenderer", function () {
    this.isA(Renderer);
    this.hasA("numberOfVariables").which.defaultsTo(3);
});

BandRenderer.GRAY = parseInt("80", 16) / 255;

Renderer.declareOptions(BandRenderer, "BandRendererOptions", [
    {
        "name"          : "linecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "linewidth",
        "type"          : Renderer.NumberOption,
        "default"       : 1
    },
    {
        "name"          : "line1color",
        "type"          : Renderer.RGBColorOption,
        "default"       : null
    },
    {
        "name"          : "line1width",
        "type"          : Renderer.NumberOption,
        "default"       : -1
    },
    {
        "name"          : "line2color",
        "type"          : Renderer.RGBColorOption,
        "default"       : null
    },
    {
        "name"          : "line2width",
        "type"          : Renderer.NumberOption,
        "default"       : -1
    },
    {
        "name"          : "fillcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(BandRenderer.GRAY,BandRenderer.GRAY,BandRenderer.GRAY)
    },
    {
        "name"          : "fillopacity",
        "type"          : Renderer.NumberOption,
        "default"       : 1.0
    }
]);

Renderer.BAND = new Renderer.Type("band");

Renderer.addType({"type"  : Renderer.Type.parse("band"),
                  "model" : BandRenderer});

module.exports = BandRenderer;

},{"../../../lib/jermaine/src/jermaine.js":9,"../../math/rgb_color.js":104,"../renderer.js":56}],59:[function(require,module,exports){
var jermaine = require('../../../lib/jermaine/src/jermaine.js');

// The Bar renderer is a 1-variable renderer which draws a bar at each
// non-missing data point with an outline around the bar and a solid
// fill between the bar and the horizontal axis.
// 
// This renderer accepts the following options:
// 
//     OPTION NAME:          barwidth
//     DATA TYPE:            DataMeasure
//     DEFAULT VALUE:        ???
//     DESCRIPTION:          Width, in relative terms to the type of the
//                           axis the plot is on, of the bars.
//                           
//     OPTION NAME:          baroffset
//     DATA TYPE:            number
//     DEFAULT VALUE:        0
//     DESCRIPTION:          The offset, in pixels, of the left edge of
//                           each bar from the corresponding data value.
//                           
//     OPTION NAME:          barbase
//     DATA TYPE:            DataValue
//     DEFAULT VALUE:        null
//     DESCRIPTION:          The location, relative to the plot's
//                           vertical axis, of the bottom of the bar; if
//                           no barbase is specified, the bars will
//                           extend down to the bottom of the plot area.
//                           
//     OPTION NAME:          linecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          The color to be used for the outline around
//                           each bar.
// 
//     OPTION NAME:          fillcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          The color to be used for the fill inside
//                           each bar; if barbase is specified, this
//                           color is used only for bars that extend
//                           above the base.
// 
//     OPTION NAME:          fillopacity
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Opacity used for the fill inside each bar.
// 
//     OPTION NAME:          hidelines
//     DATA TYPE:            number
//     DEFAULT VALUE:        2
//     DESCRIPTION:          Bars which are less wide, in pixels, than
//                           this number do not render their outlines.
//                           
var Renderer = require('../renderer.js'),
    RGBColor = require('../../math/rgb_color.js'),
    DataMeasure = require('../data_measure.js'),
    utilityFunctions = require('../../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer);

var BarRenderer = new jermaine.Model("BarRenderer", function () {
    this.isA(Renderer);
    this.hasA("numberOfVariables").which.defaultsTo(2);
});

Renderer.declareOptions(BarRenderer, "BarRendererOptions", [
    {
        "name"          : "barwidth",
        "type"          : Renderer.HorizontalDataMeasureOption,
        "default"       : new DataMeasure.parse("number", 0)
    },
    {
        "name"          : "baroffset",
        "type"          : Renderer.NumberOption,
        "default"       : 0
    },
    {
        "name"          : "barbase",
        "type"          : Renderer.VerticalDataValueOption,
        "default"       : null
    },
    {
        "name"          : "fillcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "fillopacity",
        "type"          : Renderer.NumberOption,
        "default"       : 1.0
    },
    {
        "name"          : "linecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "hidelines",
        "type"          : Renderer.NumberOption,
        "default"       : 2
    }
]);

Renderer.BAR = new Renderer.Type("bar");

Renderer.addType({"type"  : Renderer.Type.parse("bar"),
                  "model" : BarRenderer});

module.exports = BarRenderer;

},{"../../../lib/jermaine/src/jermaine.js":9,"../../math/rgb_color.js":104,"../../util/utilityFunctions.js":132,"../data_measure.js":27,"../renderer.js":56}],60:[function(require,module,exports){
var jermaine = require('../../../lib/jermaine/src/jermaine.js');

// The Fill renderer is a 1-variable renderer which connects consecutive
// non-missing data points with line segments with a solid fill between
// the lines and the horizontal axis.
// 
// The line segements should occlude the solid fill.
// 
// This renderer accepts the following options:
// 
//     OPTION NAME:          linecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          Color used for line segments
// 
//     OPTION NAME:          linewidth
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Width, in pixels, of line segments.  A
//                           value of 0 means do not draw line segments.
// 
//     OPTION NAME:          fillcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x808080 (dark gray)
//     DESCRIPTION:          Color used for the fill area.
// 
//     OPTION NAME:          downfillcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        null
//     DESCRIPTION:          Color used for fill area that is below the
//                           fillbase, if a fillbase is specified. If no
//                           downfillcolor is specifed, fillcolor will
//                           be used for all fill areas.
// 
//     OPTION NAME:          fillopacity
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Opacity used for the fill area.
// 
//     OPTION NAME:          fillbase
//     DATA TYPE:            DataValue
//     DEFAULT VALUE:        null
//     DESCRIPTION:          The location along the plot's vertical axis
//                           of the horizontal line that defines the
//                           bottom (or top) of the filled region; if no
//                           fillbase is specified, the fill will extend
//                           down to the bottom of the plot area.
// 
var Renderer = require('../renderer.js'),
    RGBColor = require('../../math/rgb_color.js'),
    utilityFunctions = require('../../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer);

var FillRenderer = new jermaine.Model("FillRenderer", function () {
    this.isA(Renderer);
    this.hasA("numberOfVariables").which.defaultsTo(2);
});

FillRenderer.GRAY = parseInt("80", 16) / 255;

Renderer.declareOptions(FillRenderer, "FillRendererOptions", [
    {
        "name"          : "linecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "linewidth",
        "type"          : Renderer.NumberOption,
        "default"       : 1
    },
    {
        "name"          : "fillcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(FillRenderer.GRAY,FillRenderer.GRAY,FillRenderer.GRAY)
    },
    {
        "name"          : "downfillcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : null
    },
    {
        "name"          : "fillopacity",
        "type"          : Renderer.NumberOption,
        "default"       : 1.0
    },
    {
        "name"          : "fillbase",
        "type"          : Renderer.VerticalDataValueOption,
        "default"       : null
    }
]);

Renderer.FILL = new Renderer.Type("fill");

Renderer.addType({"type"  : Renderer.Type.parse("fill"),
                  "model" : FillRenderer});

module.exports = FillRenderer;

},{"../../../lib/jermaine/src/jermaine.js":9,"../../math/rgb_color.js":104,"../../util/utilityFunctions.js":132,"../renderer.js":56}],61:[function(require,module,exports){
var jermaine = require('../../../lib/jermaine/src/jermaine.js');

// The Pointline renderer is a 1-variable renderer which draws a shape
// at each non-missing data point, and connects consecutive
// non-missing data points with line segments.  The drawing of both
// the points, and the lines, is optional, so this renderer can be
// used to draw just points, just line segments, or both.
// 
// When both points and line segments are drawn, the points should
// be drawn on "top of" the line segments.
// 
// This renderer accepts the following options:
// 
//     OPTION NAME:          linewidth
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Width, in pixels, of line segments.  A
//                           value of 0 means do not draw line segments.
// 
//     OPTION NAME:          linecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          Color used for line segments
// 
//     OPTION NAME:          pointsize
//     DATA TYPE:            number
//     DEFAULT VALUE:        0
//     DESCRIPTION:          The radius of drawn points.  A value
//                           of 0 means do not draw points.
// 
//     OPTION NAME:          pointcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          Color used for drawing points
// 
//     OPTION NAME:          pointshape
//     DATA TYPE:            One of the constants PointlineRenderer.CIRCLE,
//                           PointlineRenderer.SQUARE, PointlineRenderer.TRIANGLE,
//                           PointlineRenderer.DIAMOND, PointlineRenderer.STAR,
//                           PointlineRenderer.PLUS, or PointlineRenderer.X.  These
//                           correspond to the strings "circle", "square", "triangle",
//                           "diamond", "star", "plus", and "x" in MUGL files.
//     DEFAULT VALUE:        PointlineRenderer.CIRCLE
//     DESCRIPTION:          The shape to use for drawing points.
// 
//     OPTION NAME:          pointopacity
//     DATA TYPE:            number
//     DEFAULT VALUE:        1.0
//     DESCRIPTION:          The opactiy of the drawn points, in the range 0-1.
//                           A value of 1 means completely opaque; a value of 0
//                           means completely invisible.
// 
//     OPTION NAME:          pointoutlinewidth
//     DATA TYPE:            number
//     DEFAULT VALUE:        0
//     DESCRIPTION:          The width, in pixels, of the outline to be drawn
//                           around each point.  A value of 0 means draw no
//                           outline.
// 
//     OPTION NAME:          pointoutlinecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          The color to use for the outline around each point.
//
var Renderer = require('../renderer.js'),
    RGBColor = require('../../math/rgb_color.js'),
    utilityFunctions = require('../../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer);

var PointlineRenderer = new jermaine.Model("PointlineRenderer", function () {
    this.isA(Renderer);
    this.hasA("numberOfVariables").which.defaultsTo(2);
    //
    //this.isBuiltWith(...)  NO NO NO!!!
    //
    // DO NOT CALL isBuiltWith for a renderer subclass; Renderer.declareOptions calls isBuiltWith(), and it
    // will break if you also call it here!!!
});


PointlineRenderer.CIRCLE   = "circle";
PointlineRenderer.SQUARE   = "square";
PointlineRenderer.TRIANGLE = "triangle";
PointlineRenderer.DIAMOND  = "diamond";
PointlineRenderer.STAR     = "star";
PointlineRenderer.PLUS     = "plus";
PointlineRenderer.X        = "x";

PointlineRenderer.shapes = [ 
    PointlineRenderer.CIRCLE,
    PointlineRenderer.SQUARE,
    PointlineRenderer.TRIANGLE,
    PointlineRenderer.DIAMOND,
    PointlineRenderer.STAR,
    PointlineRenderer.PLUS,
    PointlineRenderer.X
];

PointlineRenderer.isShape = function (shape) {
    var i;
    for (i=0; i<PointlineRenderer.shapes.length; ++i) {
        if (PointlineRenderer.shapes[i] === shape) { return true; }
    }
    return false;
};

PointlineRenderer.parseShape = function (string) {
    if (string.toLowerCase() === PointlineRenderer.CIRCLE)   { return PointlineRenderer.CIRCLE;   }
    if (string.toLowerCase() === PointlineRenderer.SQUARE)   { return PointlineRenderer.SQUARE;   }
    if (string.toLowerCase() === PointlineRenderer.TRIANGLE) { return PointlineRenderer.TRIANGLE; }
    if (string.toLowerCase() === PointlineRenderer.DIAMOND)  { return PointlineRenderer.DIAMOND;  }
    if (string.toLowerCase() === PointlineRenderer.STAR)     { return PointlineRenderer.STAR;     }
    if (string.toLowerCase() === PointlineRenderer.PLUS)     { return PointlineRenderer.PLUS;     }
    if (string.toLowerCase() === PointlineRenderer.X)        { return PointlineRenderer.X;        }
    throw new Error("unknown point shape: " + string);
};

/*
 * This function converts a "shape" enum object to a string.  In reality, the objects ARE
 * the strings, so we just return the object.
 */
PointlineRenderer.serializeShape = function (shape) {
    return shape;
};

PointlineRenderer.ShapeOption = new jermaine.Model("PointlineRenderer.ShapeOption", function () {
    this.isA(Renderer.Option);
    this.hasA("value").which.validatesWith(PointlineRenderer.isShape);
    this.isBuiltWith("value");
    this.respondsTo("serializeValue", function () {
        return PointlineRenderer.serializeShape(this.value());
    });
    this.respondsTo("parseValue", function (string) {
        this.value( PointlineRenderer.parseShape(string) );
    });
    this.respondsTo("valueEq", function (value) {
        return (this.value()===value);
    });
});


Renderer.declareOptions(PointlineRenderer, "PointlineRendererOptions", [
    {
        "name"          : "linecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "linewidth",
        "type"          : Renderer.NumberOption,
        "default"       : 1
    },
    {
        "name"          : "pointshape",
        "type"          : PointlineRenderer.ShapeOption,
        "default"       : PointlineRenderer.CIRCLE
    },
    {
        "name"          : "pointsize",
        "type"          : Renderer.NumberOption,
        "default"       : 0
    },
    {
        "name"          : "pointcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "pointopacity",
        "type"          : Renderer.NumberOption,
        "default"       : 1.0
    },
    {
        "name"          : "pointoutlinewidth",
        "type"          : Renderer.NumberOption,
        "default"       : 0
    },
    {
        "name"          : "pointoutlinecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    }
]);

Renderer.POINTLINE = new Renderer.Type("pointline");
Renderer.POINT     = new Renderer.Type("point");
Renderer.LINE      = new Renderer.Type("line");

Renderer.addType({"type"  : Renderer.Type.parse("pointline"),
                  "model" : PointlineRenderer});
Renderer.addType({"type"  : Renderer.Type.parse("line"),
                  "model" : PointlineRenderer});
Renderer.addType({"type"  : Renderer.Type.parse("point"),
                  "model" : PointlineRenderer});

module.exports = PointlineRenderer;


},{"../../../lib/jermaine/src/jermaine.js":9,"../../math/rgb_color.js":104,"../../util/utilityFunctions.js":132,"../renderer.js":56}],62:[function(require,module,exports){
var jermaine = require('../../../lib/jermaine/src/jermaine.js');

// The RangeBar renderer is a 2-variable renderer which draws a
// vertical bar between two data values, and optionally outlines
// around the bars.  It is very similar to the Bar renderer except
// that the bar is drawn between two data values, instead of between a
// single data value and a base line.
// 
// The line segements should occlude the solid fill.
// 
// This renderer accepts the following options:
// 
//     OPTION NAME:          barwidth
//     DATA TYPE:            DataMeasure
//     DEFAULT VALUE:        ???
//     DESCRIPTION:          Width, in relative terms to the type of the
//                           axis the plot is on, of the bars.
//                           
//     OPTION NAME:          baroffset
//     DATA TYPE:            number
//     DEFAULT VALUE:        0
//     DESCRIPTION:          The offset of the left edge of each bar
//                           from the corresponding data value, as a
//                           fraction (0-1) of the barwidth.
// 
//     OPTION NAME:          fillcolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x808080 (dark gray)
//     DESCRIPTION:          Color used for filling the bars.
// 
//     OPTION NAME:          fillopacity
//     DATA TYPE:            number
//     DEFAULT VALUE:        1
//     DESCRIPTION:          Opacity used for the fill area.
// 
//     OPTION NAME:          linecolor
//     DATA TYPE:            RGBColor
//     DEFAULT VALUE:        0x000000 (black)
//     DESCRIPTION:          Color used for outlines around the bars.
// 
//     OPTION NAME:          linewidth
//     DATA TYPE:            number
//     DEFAULT VALUE:        0
//     DESCRIPTION:          Width, in pixels, of outlines around
//                           the bars.  A value of 0 (which is the
//                           default) means don't draw outlines.
// 
//     OPTION NAME:          hidelines
//     DATA TYPE:            number
//     DEFAULT VALUE:        2
//     DESCRIPTION:          Bars which are less wide, in pixels, than
//                           this number do not render their outlines.
// 
var Renderer = require('../renderer.js'),
    RGBColor = require('../../math/rgb_color.js'),
    DataMeasure = require('../data_measure.js'),
    utilityFunctions = require('../../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.plot.renderer);

var RangeBarRenderer = new jermaine.Model("RangeBarRenderer", function () {
    this.isA(Renderer);
    this.hasA("numberOfVariables").which.defaultsTo(3);
});

Renderer.declareOptions(RangeBarRenderer, "RangeBarRendererOptions", [
    {
        "name"          : "barwidth",
        "type"          : Renderer.HorizontalDataMeasureOption,
        "default"       : new DataMeasure.parse("number", 0)
    },
    {
        "name"          : "baroffset",
        "type"          : Renderer.NumberOption,
        "default"       : 0
    },
    {
        "name"          : "fillcolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : RGBColor.parse("0x808080")
    },
    {
        "name"          : "fillopacity",
        "type"          : Renderer.NumberOption,
        "default"       : 1.0
    },
    {
        "name"          : "linecolor",
        "type"          : Renderer.RGBColorOption,
        "default"       : new RGBColor(0,0,0)
    },
    {
        "name"          : "linewidth",
        "type"          : Renderer.NumberOption,
        "default"       : 1
    },
    {
        "name"          : "hidelines",
        "type"          : Renderer.NumberOption,
        "default"       : 2
    }
]);

Renderer.RANGEBAR = new Renderer.Type("rangebar");

Renderer.addType({"type"  : Renderer.Type.parse("rangebar"),
                  "model" : RangeBarRenderer});

module.exports = RangeBarRenderer;

},{"../../../lib/jermaine/src/jermaine.js":9,"../../math/rgb_color.js":104,"../../util/utilityFunctions.js":132,"../data_measure.js":27,"../renderer.js":56}],63:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/**
 * Text is a Jermaine model that supports storing and determining metrics of
 * strings in different graphics contexts.
 *
 * @class Text
 * @for Text
 * @constructor
 * @param string {String} The string stored in the Text model
 */
var Text = new jermaine.Model("Text", function () {
    this.isBuiltWith("string");

    /**
     * The string stored in the Text model
     *
     * @property string
     * @type {String}
     */
    this.hasA("string").which.isA("string");

    /**
     * The unrotated width of the string
     *
     * @property origWidth
     * @type {float}
     * @final
     */
    this.hasA("origWidth").which.isA("number");

    /**
     * The unrotated height of the string
     *
     * @property origHeight
     * @type {float}
     * @final
     */
    this.hasA("origHeight").which.isA("number");

    /**
     * The rotated width of the string
     *
     * @property rotatedWidth
     * @type {float}
     * @final
     */
    this.hasA("rotatedWidth").which.isA("number");

    /**
     * The rotated height of the string
     *
     * @property rotatedHeight
     * @type {float}
     * @final
     */
    this.hasA("rotatedHeight").which.isA("number");

    /**
     * Determines unrotated and rotated widths and heights for the stored string. Overridden by
     * implementations in graphics drivers.
     *
     * @method initializeGeometry
     * @chainable
     * @param {Object} graphicsContext
     *   @param {Float} graphicsContext.angle
     */
    this.respondsTo("initializeGeometry", function (graphicsContext) {
        var origWidth,
            origHeight,
            rotatedWidth,
            rotatedHeight;

        origWidth  = this.measureStringWidth(graphicsContext);
        origHeight = this.measureStringHeight(graphicsContext);
        rotatedWidth = origWidth;
        rotatedHeight = origHeight;

        if (graphicsContext && graphicsContext.angle !== undefined) {
            var angle = graphicsContext.angle/180 * Math.PI;
            rotatedWidth = Math.abs(Math.cos(angle)) * origWidth + Math.abs(Math.sin(angle)) * origHeight;
            rotatedHeight = Math.abs(Math.sin(angle)) * origWidth + Math.abs(Math.cos(angle)) * origHeight;
        }

        this.origWidth(origWidth);
        this.origHeight(origHeight);
        this.rotatedWidth(rotatedWidth);
        this.rotatedHeight(rotatedHeight);

        return this;
    });

    /**
     * Determines unrotated width for the stored string. Overridden by implementations in graphics
     * drivers.
     *
     * @method measureStringWidth
     * @private
     * @return {Float} Unrotated width of string.
     * @param {Object} graphicsContext
     */
    this.respondsTo("measureStringWidth", function (graphicsContext) {
        // Graphics drivers should replace this method with an actual implementation; this
        // is just a placeholder.  The implementation should return the width, in pixels,
        // of the given string.  Of course this is dependent on font choice, size, etc,
        // but we gloss over that at the moment.  Just return the width of the string
        // using some reasonable default font for now.  Later on, we'll modify this
        // function to use font information.
        var lines,
            maxLength = 1,
            testLength,
            i;

        if (this.string() === undefined) {
            throw new Error("measureStringWidth requires the string attr to be set.");
        }

        lines = this.string().split(/\n/);
        for (i = 0; i < lines.length; i++) {
            testLength = lines[i].length;
            if (testLength > maxLength) {
                maxLength = testLength;
            }
        }
        
        return maxLength * 15;
    });

    /**
     * Determines unrotated height for the stored string. Overridden by implementations in graphics
     * drivers.
     *
     * @method measureStringHeight
     * @private
     * @return {Float} Unrotated height of string.
     * @param {Object} graphicsContext
     */
    this.respondsTo("measureStringHeight", function (graphicsContext) {
        // Graphics drivers should replace this method with an actual implementation; this
        // is just a placeholder.  The implementation should return the height, in pixels,
        // of the given string.  Of course this is dependent on font choice, size, etc,
        // but we gloss over that at the moment.  Just return the height of the string
        // using some reasonable default font for now.  Later on, we'll modify this
        // function to use font information.
        if (this.string() === undefined) {
            throw new Error("measureStringHeight requires the string attr to be set.");
        }
        var newlineCount = this.string().match(/\n/g);
        return (newlineCount !== null ? (newlineCount.length + 1) : 1) * 12;
    });
});

module.exports = Text;

},{"../../lib/jermaine/src/jermaine.js":9}],64:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Text = require('./text.js'),
    RGBColor = require('../math/rgb_color.js'),
    Point = require('../math/point.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.title);

/**
 * Title is a Jermiane model that controls Graph Titles.
 *
 * @class Title
 * @for Title
 * @constructor
 * @param {Text} text
 * @param {Graph} graph
 * @author jrfrimme
 */
var Title = new jermaine.Model("GraphTitle", function () {
    /**
     * Pointer to the Title's parent Graph Jermaine model.
     *
     * @property graph
     * @type {Graph}
     * @author jrfrimme
     */
    this.hasA("graph").which.validatesWith(function (graph) {
        var Graph = require('./graph.js');
        return graph instanceof Graph;
    });
    /**
     * The text of the title.
     *
     * @property text
     * @type {Text}
     * @author jrfrimme
     */
    this.hasA("text").which.validatesWith(function (text) {
        return text instanceof Text;
    });
    /**
     * Determines if the Title is positioned relative to the Graphs `plot` or `padding`
     * box.
     *
     * @property frame
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("frame").which.isA("string");
    /**
     * The width of the border to be drawn around the title in pixel; use a value of `0`
     * to not draw a border.
     *
     * @property border
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("border").which.isAn("integer");
    /**
     * Background color for the Title's region.
     *
     * @property color
     * @type {RGBColor}
     * @author jrfrimme
     */
    this.hasA("color").which.validatesWith(function (color) {
        return color instanceof RGBColor;
    });
    /**
     * Color for the Title's border.
     *
     * @property bordercolor
     * @type {RGBColor}
     * @author jrfrimme
     */
    this.hasA("bordercolor").which.validatesWith(function (bordercolor) {
        return bordercolor instanceof RGBColor;
    });
    /**
     * Opacity of the Title's region.
     *
     * @property opacity
     * @type {Number}
     * @author jrfrimme
     */
    this.hasA("opacity").which.isA("number");
    /**
     * The width of the padding between the Title's text and its border in pixels; use a
     * value of `0` to not draw the padding.
     *
     * @property padding
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("padding").which.isAn("integer");
    /**
     * Determines whether the corners of the title appear rounded. If cornerradius is 0,
     * which is the default, the corners are drawn square. If cornerradius > 0, then the
     * corners are rounded off using circles whose radius is cornerradius pixels.
     *
     * @property cornerradius
     * @deprecated
     * @type {Integer}
     * @author jrfrimme
     */
    this.hasA("cornerradius").which.isAn("integer");
    /**
     * A coordinate pair which gives the relative location of the Title's anchor point.
     *
     * @property anchor
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("anchor").which.validatesWith(function (anchor) {
        return anchor instanceof Point;
    });
    /**
     * A coordinate pair which gives the location of the Title's base point, relative to
     * its Graph's plot or padding box - determined by the `frame` attribute.
     *
     * @property base
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("base").which.validatesWith(function (base) {
        return base instanceof Point;
    });
    /**
     * A coordinate pair of pixel offsets for the base point.
     *
     * @property position
     * @type {Point}
     * @author jrfrimme
     */
    this.hasA("position").which.validatesWith(function (position) {
        return position instanceof Point;
    });
    /**
     * The font-size of the title. Currently is a constant.
     *
     * @property font-size
     * @type {String}
     * @author jrfrimme
     */
    this.hasA("fontSize").which.isA("string").and.defaultsTo("18px");

    /**
     * Determines the geometry of the Title's text.
     *
     * @method initializeGeometry
     * @chainable
     * @param {Object} graphicsContext
     * @author jrfrimme
     */
    this.respondsTo("initializeGeometry", function (graphicsContext) {
        graphicsContext.fontSize = this.fontSize();
        this.text().initializeGeometry(graphicsContext);
        return this;
    });

    /**
     * Renders the Graph Title. Overridden by implementations in graphics drivers.
     *
     * @method render
     * @private
     * @author jrfrimme
     */
    this.respondsTo("render", function () {});

    this.isBuiltWith("text", "graph");

    utilityFunctions.insertDefaults(this, defaultValues.title, attributes);

});

module.exports = Title;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/point.js":103,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132,"./graph.js":40,"./text.js":63}],65:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Warning = function(message) {
    this.message = message;
};

Warning.prototype = new Error();

module.exports  = Warning;

},{"../../lib/jermaine/src/jermaine.js":9}],66:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
var WebServiceData;
module.exports = function($) {
    if (typeof(WebServiceData) !== "undefined") { return WebServiceData; }

    var jermaine = require('../../lib/jermaine/src/jermaine.js');

    var Data = require('./data.js'),
        DataValue = require('./data_value.js'),
        DataFormatter = require('./data_formatter.js'),
        ArrayData = require('./array_data.js'),
        WebServiceDataCacheNode = require('./web_service_data_cache_node.js'),
        WebServiceDataIterator = require('./web_service_data_iterator.js');

    WebServiceData = new jermaine.Model(function () {
        this.isA(Data);
        this.hasA("serviceaddress").which.isA("string");
        this.hasA("serviceaddresspattern").which.isA("string");
        this.hasA("format").which.isA("string");
        this.hasA("formatter").which.validatesWith(DataFormatter.isInstance);
        this.hasA("messageHandler");
        this.hasA("ajaxthrottle");
        this.isBuiltWith("columns", "serviceaddress", "%messageHandler", "%ajaxthrottle", function () {
            this.init();
            if (this.columns().size() > 0) {
                var column0Type = this.columns().at(0).type();
                if (this.format() === undefined) {
                    this.format(column0Type===DataValue.NUMBER ? "%f" : "%Y%M%D%H%i%s");
                }
                this.formatter(DataFormatter.create(column0Type, this.format()));
            }
            if (this.ajaxthrottle() === undefined) {
                this.ajaxthrottle($);
            }
        });

        this.respondsTo("_displayError", function (e) {
            if (this.messageHandler()) {
                this.messageHandler().error(e);
            } else {
                throw e;
            }
        });

        this.respondsTo("getBounds", function (columnNumber) {
            // TODO: replace this kludge
            return [0, 10];
        });

        this.hasA("arraydata").which.defaultsTo(null).and.validatesWith(function (arraydata) {
            return arraydata instanceof ArrayData || arraydata === null;
        });

        /**
         * A pointer to the head WebServiceDataCacheNode in this WebServieData's cache.
         *
         * @property cacheHead
         * @type {null|WebServiceDataCacheNode}
         * @author jrfrimme
         */
        this.hasA("cacheHead").which.defaultsTo(null).and.validatesWith(function (x) {
            return x === null || x instanceof WebServiceDataCacheNode;
        });

        /**
         * A pointer to the tail WebServiceDataCacheNode in this WebServieData's cache.
         *
         * @property cacheTail
         * @type {null|WebServiceDataCacheNode}
         * @author jrfrimme
         */
        this.hasA("cacheTail").which.defaultsTo(null).and.validatesWith(function (x) {
            return x === null || x instanceof WebServiceDataCacheNode;
        });

        /**
         * Return a pointer to the first WebServiceDataCacheNode in this WebServieData's cache
         * that actually contains data, if any.  If the cache doesn't contain any data, return null.
         *
         * @method dataHead
         * @author jrfrimme
         * @return {null|WebServiceDataCacheNode}
         */
        this.respondsTo("dataHead", function () {
            var head = this.cacheHead();
            if (head === null) { return null; }
            if (head.hasData()) { return head; }
            return head.dataNext();
        });

        /**
         * Return a pointer to the last WebServiceDataCacheNode in this WebServieData's cache
         * that actually contains data, if any.  If the cache doesn't contain any data, return null.
         *
         * @method dataTail
         * @author jrfrimme
         * @return {null|WebServiceDataCacheNode}
         */
        this.respondsTo("dataTail", function () {
            var tail = this.cacheTail();
            if (tail === null) { return null; }
            if (tail.hasData()) { return tail; }
            return tail.dataPrev();
        });

        /**
         * Insert a WebServiceCacheNode into this WebService's cache.
         * If this node's coveredMin is less than the cache head's
         * coveredMin, insert it at the head; otherwise insert it at
         * the tail.  Note that nodes are only inserted either at the
         * head or at the tail of the cache --- not in the middle.
         *
         * @method insertCacheNode
         * @param {WebServiceCacheNode} node
         * @author jrfrimme
         */
        this.respondsTo("insertCacheNode", function (node) {
            var head = this.cacheHead(),
                tail = this.cacheTail();
            if (head === null) {
                this.cacheHead(node);
                this.cacheTail(node);
            } else {
                if (node.coveredMin().lt(head.coveredMin())) {
                    node.next(head);
                    head.prev(node);
                    this.cacheHead(node);
                } else {
                    node.prev(tail);
                    tail.next(node);
                    this.cacheTail(node);
                }
            }
        });

        this.respondsTo("constructRequestURL", function (min, max) {
            var serviceaddress = this.serviceaddress(),
                formatter = this.formatter();

            if (serviceaddress === undefined) {
                throw new Error("WebServiceData.constructRequestURL: undefined service address");
            }
            if (formatter === undefined) {
                throw new Error("WebServiceData.constructRequestURL: undefined formatter for column 0");
            }
            if (this.serviceaddresspattern() === undefined) {
                if ((serviceaddress.indexOf("$min") < 0) &&
                    (serviceaddress.indexOf("$max") < 0)) {
                    this.serviceaddresspattern(serviceaddress + "$min,$max");
                } else {
                    this.serviceaddresspattern(serviceaddress);
                }
            }
            return (this.serviceaddresspattern()
                    .replace("$min", formatter.format(min))
                    .replace("$max", formatter.format(max)));
        });

        this.hasA("coveredMin").which.defaultsTo(null).and.validatesWith(function (x) {
            return x === null || DataValue.isInstance(x);
        });
        this.hasA("coveredMax").which.defaultsTo(null).and.validatesWith(function (x) {
            return x === null || DataValue.isInstance(x);
        });

        /**
         * Initiate requests needed to fetch data between coveredMin and coveredMax, if any.
         *
         * @method insureCoveredRange
         * @author jrfrimme
         */
        this.respondsTo("insureCoveredRange", function () {
            var head = this.cacheHead(),
                tail = this.cacheTail(),
                coveredMin = this.coveredMin(),
                coveredMax = this.coveredMax();

            if (coveredMin === null || coveredMax === null) {
                return;
            }
            if (head === null || tail === null) {
                this.requestSingleRange(coveredMin, coveredMax);
            } else {
                if (coveredMin.lt(head.coveredMin())) {
                    //                     head's min              tail's max
                    //  -----|-------------|-----------------------|----------------
                    //       coveredMin
                    this.requestSingleRange(coveredMin, head.coveredMin());
                }
                if (coveredMax.gt(tail.coveredMax())) {
                    //                     head's min              tail's max
                    //  -------------------|-----------------------|-----------|----
                    //                                                         coveredMax
                    this.requestSingleRange(tail.coveredMax(), coveredMax);
                }
            }
        });

        this.respondsTo("requestSingleRange", function (min, max) {
            var node,
                requestURL,
                that = this,
                JQueryXMLParser = require('../parser/jquery_xml_parser.js')($);

            // create the cache node that will hold the data in this range
            node = new WebServiceDataCacheNode(min, max);

            // insert it into the cache linked list
            this.insertCacheNode(node);

            // construct the URL for fetching the data in this range
            requestURL = this.constructRequestURL(min, max);

            // initiate the fetch request
            this.emit({type : 'ajaxEvent', action : 'start'});
            this.ajaxthrottle().ajax({
                url      : requestURL,
                dataType : "text",
                success  : function (data) {
                    // if data contains a <values> tag, extract its text string value
                    if (data.indexOf("<values>") > 0) {
                        data = JQueryXMLParser.stringToJQueryXMLObj(data).find("values").text();
                    }
                    node.parseData(that.getColumns(), data);

                    that.emit({type : 'ajaxEvent', action : 'success'});
                    that.emit({type : 'dataReady'});
                },

                error : function (jqXHR, textStatus, errorThrown) {
                    var message = errorThrown;
                    if (jqXHR.statusCode().status === 404) {
                        message = "URL not found: '" + requestURL + '"';
                    } else {
                        if (textStatus) {
                            message = textStatus + ": " + message;
                        }
                    }
                    that._displayError(new Error(message));
                },

                // 'complete' callback gets called after either 'success' or 'error', whichever:
                complete : function (jqXHR, textStatus) {
                    that.emit({type : 'ajaxEvent', action : 'complete'});
                }

            });
        });

        this.respondsTo("getIterator", function (columnIds, min, max, buffer) {
            var initialNode,
                initialIndex,
                n, b, i, tmp,
                finalNode,
                finalIndex,
                columnIndices;

            // if min > max, swap them
            if (min.gt(max)) {
                tmp = min;
                min = max;
                max = tmp;
            }

            if (this.coveredMin() === null || min.lt(this.coveredMin())) {
                this.coveredMin(min.clone());
            }
            if (this.coveredMax() === null || max.gt(this.coveredMax())) {
                this.coveredMax(max.clone());
            }

            if (!this.paused()) {
                this.insureCoveredRange();
            }

            if (this.dataHead() === null) {
                // cache is empty, return empty iterator:
                return {
                    "next"    : function () {},
                    "hasNext" : function () { return false; }
                };
            }
            // convert columnIds to columnIndices
            columnIndices = [];
            for (i = 0; i < columnIds.length; ++i) {
                columnIndices.push( this.columnIdToColumnNumber(columnIds[i]) );
            }

            // find the data node containing the 'min' value
            initialNode = this.dataHead();
            while ((initialNode !== null) &&
                   (initialNode.dataNext() !== null) &&
                   (min.gt(initialNode.dataMax()))) {
                initialNode = initialNode.dataNext();
            }
            
            if (initialNode === null || !initialNode.hasData()) {
                initialIndex = -1;
            } else {
                initialIndex = 0;
                // find the index within the initial node corresponding to the 'min' value
                while ((initialIndex < initialNode.data().length-1) &&
                       (initialNode.data()[initialIndex][columnIndices[0]].lt(min))) {
                    ++initialIndex;
                }
                
                // back up 'buffer' steps, being careful not to go further back than the first element of the head node
                n = 0;
                while (n<buffer) {
                    --initialIndex;
                    if (initialIndex<0) {
                        b = initialNode.dataPrev();
                        if (b !== null) {
                            initialNode = b;
                            initialIndex = initialNode.data().length-1;
                        } else {
                            initialIndex = 0;
                            break;
                        }
                    }
                    ++n;
                }
                
                // find the data node containing the 'max' value
                finalNode = initialNode;
                while ( (max.gt(finalNode.dataMax())) &&
                        (finalNode.dataNext() !== null) ) {
                    finalNode = finalNode.dataNext();
                }
                
                // find the index within the final node corresponding to the 'max' value
                finalIndex = 0;
                if (finalNode === initialNode) {
                    finalIndex = initialIndex;
                }
                while ((finalIndex < finalNode.data().length-1) &&
                       (finalNode.data()[finalIndex][columnIndices[0]].lt(max))) {
                    ++finalIndex;
                }
                
                // go forward 'buffer' more steps, being careful not to go further than the last element of the tail
                n = 0;
                //while (n<buffer && !(finalNode===_tail && finalIndex<finalNode.data.length)) {
                while (n < buffer) {
                    ++finalIndex;
                    if (finalIndex >= finalNode.data().length) {
                        b = finalNode.dataNext();
                        if (b !== null) {
                            finalNode = b;
                            finalIndex = 0;
                        } else {
                            finalIndex = finalNode.data().length-1;
                            break;
                        }
                    }
                    ++n;
                }
                
            }
            
            return new WebServiceDataIterator(columnIndices, initialNode, initialIndex, finalNode, finalIndex);
        });

        this.hasA("paused").which.isA("boolean").and.defaultsTo(false);
        this.respondsTo("pause", function() {
            this.paused(true);
        });
        this.respondsTo("resume", function() {
            this.paused(false);
            this.emit({type : 'dataReady',
                       min : this.coveredMin(),
                       max : this.coveredMax()});
        });

    });

    return WebServiceData;
};

},{"../../lib/jermaine/src/jermaine.js":9,"../parser/jquery_xml_parser.js":119,"./array_data.js":18,"./data.js":25,"./data_formatter.js":26,"./data_value.js":29,"./web_service_data_cache_node.js":67,"./web_service_data_iterator.js":68}],67:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/**
 * A WebServiceDataCacheNode represents a single node in the
 * doubly-linked list holding the data for a WebServiceDataCache.
 * The WebServiceDataCacheNode has an array of data (which may
 * actually be null, if the node's data has not yet been loaded),
 * next and prev pointers to the next and previous nodes in the
 * linked list, and coveredMin and coveredMax values that indicate
 * the min and max values of the "covered" range of data for this
 * node.
 * 
 * The "covered" range is the interval of the data number line for
 * which this node is responsible for storing data; Multigraph
 * uses range this to avoid requesting the same data twice --- it
 * never requests data for a range already covered by an existing
 * cache node.
 * 
 * Initially, when the WebServiceDataCacheNode is created, the
 * limits of the covered range are specified in the constructor.
 * Later on, when the node's data is actually populated, the
 * limits are potentially adjusted outward, if the range of data
 * received is larger than the initially specified covered range.
 * So in all cases, the covered range indicates the range for
 * which no more data is needed, because it's covered by this
 * node.
 * 
 * Note that the covered range is never adjusted to be smaller.
 * 
 * The WebServiceDataCacheNode does not actually fetch any data
 * --- it is simply a storage container for fetched data; it's up
 * to other code outside of this object to fetch and populate the
 * data.
 *
 * @class WebServiceDataCacheNode
 * @for WebServiceDataCacheNode
 * @constructor
 * @param {DataValue} coveredMin
 * @param {DataValue} coveredMax
 */
var DataValue = require('./data_value.js'),
    ArrayData = require('./array_data.js');

var WebServiceDataCacheNode = new jermaine.Model(function () {

    /**
     * The actual data for this node.
     *
     * @property data
     * @type {Array|null}
     * @author jrfrimme
     */
    this.hasA("data").which.defaultsTo(null).and.validatesWith(function (data) {
        var validationFunctions = require('../util/validationFunctions.js');
        // accept null
        if (data === null) { return true; }
        // only accept arrays
        if (validationFunctions.typeOf(data) !== "array") {
            this.message = "WebServiceDataCacheNode's data attribute is not an Array";
            return false;
        }
        // if the array contains anything, do a cursory check that it looks
        // like an array of DataValue arrays (just check the first row)
        if (data.length > 0) {
            var firstRow = data[0],
                i;
            if (validationFunctions.typeOf(firstRow) !== "array") {
                this.message = "WebServiceDataCacheNode's data attribute is not an Array of Arrays";
                return false;
            }
            for (i = 0; i < firstRow.length; ++i) {
                if (!DataValue.isInstance(firstRow[i])) {
                    this.message = "WebServiceDataCacheNode's data attribute is not an Array of Arrays of DataValues (bad value in position " + i + " of first row";
                    return false;
                }
            }
        }
        return true;
    });

    /**
     * The next node in the cache's linked list
     *
     * @property next
     * @type {WebServiceDataCacheNode|null}
     * @author jrfrimme
     */
    this.hasA("next").which.defaultsTo(null).and.validatesWith(function (x) {
        return x === null || x instanceof WebServiceDataCacheNode;
    });

    /**
     * The previous node in the cache's linked list
     *
     * @property prev
     * @type {WebServiceDataCacheNode|null}
     * @author jrfrimme
     */
    this.hasA("prev").which.defaultsTo(null).and.validatesWith(function (x) {
        return x === null || x instanceof WebServiceDataCacheNode;
    });

    /**
     * The min of the covered value range
     *
     * @property coveredMin
     * @type {DataValue}
     * @author jrfrimme
     */
    this.hasA("coveredMin").which.validatesWith(DataValue.isInstance);

    /**
     * The max of the covered value range
     *
     * @property coveredMax
     * @type {DataValue}
     * @author jrfrimme
     */
    this.hasA("coveredMax").which.validatesWith(DataValue.isInstance);

    /**
     * Return the next node in the cache that actually has data,
     * or null if none exists.
     *
     * @method dataNext
     * @author jrfrimme
     * @return {WebServiceDataCacheNode|null}
     */
    this.respondsTo("dataNext", function () {
        var node = this.next();
        while (node !== null && !node.hasData()) {
            node = node.next();
        }
        return node;
    });

    /**
     * Return the previous node in the cache that actually has data,
     * or null if none exists.
     *
     * @method dataPrev
     * @author jrfrimme
     * @return {WebServiceDataCacheNode|null}
     */
    this.respondsTo("dataPrev", function () {
        var node = this.prev();
        while (node !== null && !node.hasData()) {
            node = node.prev();
        }
        return node;
    });

    /**
     * Return the minimum (column 0) data value for this node.  Returns null
     * if the node has no data yet.
     *
     * @method dataMin
     * @author jrfrimme
     * @return {DataValue|null}
     */
    this.respondsTo("dataMin", function () {
        var data = this.data();
        if (data === null) { return null; }
        if (data.length === 0) { return null; }
        if (data[0] === null) { return null; }
        if (data[0].length === 0) { return null; }
        return data[0][0];
    });

    /**
     * Return the maximum (column 0) data value for this node.    Returns null
     * if the node has no data yet.
     *
     * @method dataMax
     * @author jrfrimme
     * @return {DataValue|null}
     */
    this.respondsTo("dataMax", function() {
        var data = this.data();
        if (data === null) { return null; }
        if (data.length === 0) { return null; }
        if (data[data.length-1] === null) { return null; }
        if (data[data.length-1].length === 0) { return null; }
        return data[data.length-1][0];
    });

    /**
     * Return true if this node has data; false if not.
     *
     * @method hasData
     * @author jrfrimme
     * @return Boolean
     */
    this.respondsTo("hasData", function() {
        return this.data() !== null;
    });

    this.isBuiltWith("coveredMin", "coveredMax");

    /**
     * Populate this node's data array by parsing the values
     * contained in the 'dataText' string, which should be a
     * string of comma-separated values of the same sort expected
     * by ArrayData and CSVData.  The first argument, `columns`,
     * should be a plain javascript array of DataVariable instances,
     * of the sort returned by `Data.getColumns()`.
     * 
     * This method examines other nodes in the cache in order
     * insure that values included in this node's data array
     * are (a) strictly greater than the maximum value present in the
     * cache prior to this node, and (b) strictly less than the
     * minimum value present in the cache after this node.
     * This guarantees that there is no overlap between the
     * data in this node and other nodes in the cache.
     *
     * @method parseData
     * @param {DataVariable Attr_List} columns
     * @param {String} dataText
     * @author jrfrimme
     */
    this.respondsTo("parseData", function (columns, dataText) {
        var i, b,
            maxPrevValue = null,
            minNextValue = null,
            arrayDataArray,
            data,
            row;

        // set maxPrevValue to the max value in column0 in the cache prior to this block, if any:
        b = this.dataPrev();
        if (b !== null) {
            maxPrevValue = b.dataMax();
        }

        // set minNextValue to the min value in column0 in the cache after this block, if any:
        b = this.dataNext();
        if (b !== null) {
            minNextValue = b.dataMin();
        }

        // convert the csv dataText string to an array
        arrayDataArray = ArrayData.textToDataValuesArray(columns, dataText);

        // populate the data array by copying values from the converted array, skipping any
        // values that are already within the range covered by the rest of the cache
        data = [];
        for (i = 0; i < arrayDataArray.length; ++i) {
            row = arrayDataArray[i];
            if ((maxPrevValue === null || row[0].gt(maxPrevValue)) &&
                (minNextValue === null || row[0].lt(minNextValue))) {
                data.push( row );
            }
        }

        // if we didn't get any new values, we're done
        if (data.length === 0) {
            return;
        }
        
        // lower the coveredMin value if the actual data received is lower than the current coveredMin value
        if (data[0][0].lt(this.coveredMin())) {
            this.coveredMin(data[0][0]);
        }

        // raise the coveredMax value if the actual data received is higher than the current coveredMax value
        if (data[data.length-1][0].gt(this.coveredMax())) {
            this.coveredMax(data[data.length-1][0]);
        }

        // load the data
        this.data( data );
    });
});

module.exports = WebServiceDataCacheNode;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/validationFunctions.js":133,"./array_data.js":18,"./data_value.js":29}],68:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

/**
 * An iterator for stepping through data values stored in a linked list of
 * WebServiceDataCacheNodes.  The constructor takes 5 arguments:
 * 
 * @class WebServiceDataIterator
 * @for WebServiceDataIterator
 * @constructor
 *
 * @param {Array} columnIndices
 *     JavaScript array of the indices of the columns
 *     of data to return
 * @param {WebServiceDataCacheNode} initialNode
 *     Pointer to the WebServiceDataCacheNode containing the first
 *     value to iterate over
 * @param {integer} initialIndex
 *     Index, within initialNode, of the first value to iterate over
 * @param {WebServiceDataCacheNode} finalNode
 *     Pointer to the WebServiceDataCacheNode containing the last
 *     value to iterate over
 * @param {integer} finalIndex
 *     Index, within finalNode, of the last value to iterate over
 */
var WebServiceDataCacheNode = require('./web_service_data_cache_node.js'),
    ValidationFunctions = require('../util/validationFunctions.js');

var WebServiceDataIterator = new jermaine.Model(function () {
    var WebServiceDataIterator = this;

    this.hasA("currentNode").which.validatesWith(function(x) {
        return x instanceof WebServiceDataCacheNode;
    });
    this.hasA("currentIndex").which.isA("integer");
    this.hasA("columnIndices").which.validatesWith(function(x) {
        return ValidationFunctions.typeOf(x) === "array";
    });
    
    this.hasA("initialNode").which.validatesWith(function(x) {
        return x instanceof WebServiceDataCacheNode;
    });
    this.hasA("finalNode").which.validatesWith(function(x) {
        return x instanceof WebServiceDataCacheNode;
    });
    this.hasA("initialIndex").which.isA("integer");
    this.hasA("finalIndex").which.isA("integer");

    this.isBuiltWith("columnIndices", "initialNode", "initialIndex", "finalNode", "finalIndex", function() {
        this.currentNode(this.initialNode());
        this.currentIndex(this.initialIndex());
    });

    this.respondsTo("hasNext", function() {
        if (this.currentNode() === null || this.currentIndex() < 0) { return false; }
        if (this.currentNode() !== this.finalNode()) {
            return true;
        }
        return this.currentIndex() <= this.finalIndex();
    });

    this.respondsTo("next", function() {
        var vals = [],
            columnIndices = this.columnIndices(),
            currentIndex = this.currentIndex(),
            finalIndex = this.finalIndex(),
            currentNode = this.currentNode(),
            i;

        if (currentNode === this.finalNode()) {
            if (currentIndex > finalIndex) { return null; }
            for (i=0; i<columnIndices.length; ++i) {
                vals.push(currentNode.data()[currentIndex][columnIndices[i]]);
            }
            this.currentIndex(++currentIndex);
            return vals;
        } else {
            for (i=0; i<columnIndices.length; ++i) {
                vals.push(currentNode.data()[currentIndex][columnIndices[i]]);
            }
            this.currentIndex(++currentIndex);
            if (currentIndex >= currentNode.data().length) {
                this.currentNode(currentNode.dataNext());
                this.currentIndex(0);
            }
            return vals;
        }
    });

});

module.exports = WebServiceDataIterator;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/validationFunctions.js":133,"./web_service_data_cache_node.js":67}],69:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Insets = require('../math/insets.js'),
    RGBColor = require('../math/rgb_color.js'),
    utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.window);

var Window = new jermaine.Model("Window", function () {

    this.hasA("width").which.isA("integer");

    this.hasA("height").which.isA("integer");

    this.hasA("border").which.isA("integer");

    this.hasA("margin").which.validatesWith(function (margin) {
        return margin instanceof Insets;
    });

    this.hasA("padding").which.validatesWith(function (padding) {
        return padding instanceof Insets;
    });

    this.hasA("bordercolor").which.validatesWith(function (bordercolor) {
        return bordercolor instanceof RGBColor;
    });

    utilityFunctions.insertDefaults(this, defaultValues.window, attributes);
});

module.exports = Window;

},{"../../lib/jermaine/src/jermaine.js":9,"../math/insets.js":102,"../math/rgb_color.js":104,"../util/utilityFunctions.js":132}],70:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var DataMeasure = require('./data_measure.js'),
    DataValue = require('./data_value.js');

var utilityFunctions = require('../util/utilityFunctions.js'),
    defaultValues = utilityFunctions.getDefaultValuesFromXSD(),
    attributes = utilityFunctions.getKeys(defaultValues.horizontalaxis.zoom);

var Zoom = new jermaine.Model("Zoom", function () {

    this.hasA("allowed").which.isA("boolean");
    this.hasA("min").which.validatesWith(function (min) {
        return DataMeasure.isInstance(min);
    });
    this.hasA("max").which.validatesWith(function (max) {
        return DataMeasure.isInstance(max);
    });
    this.hasA("anchor").which.validatesWith(function (anchor) {
        return DataValue.isInstance(anchor) || anchor === null;
    });

    utilityFunctions.insertDefaults(this, defaultValues.horizontalaxis.zoom, attributes);
});

module.exports = Zoom;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/utilityFunctions.js":132,"./data_measure.js":27,"./data_value.js":29}],71:[function(require,module,exports){
var _INCLUDED = false;

module.exports = function($, window, errorHandler) {
    if (!_INCLUDED) {
        require('./draggable/graph.js')($, window, errorHandler);
        require('./touch/graph.js')($, window, errorHandler);
        require('./touch/multigraph.js')($, window, errorHandler);
        require('./mouse/graph.js')($, window, errorHandler);
        require('./mouse/multigraph.js')($, window, errorHandler);
        require('./multigraph.js')($, window, errorHandler);
        _INCLUDED = true;
    }
};

},{"./draggable/graph.js":72,"./mouse/graph.js":73,"./mouse/multigraph.js":74,"./multigraph.js":75,"./touch/graph.js":76,"./touch/multigraph.js":77}],72:[function(require,module,exports){
module.exports = function($, window, errorHandler) {
    var Graph = require('../../core/graph.js'),
        Axis = require('../../core/axis.js');

    if (typeof(Graph.dragStarted)==="function") { return Graph; }

    Graph.hasA("dragStarted").which.isA("boolean");
    Graph.hasA("dragOrientation").which.validatesWith(Axis.Orientation.isInstance);
    Graph.hasA("dragAxis").which.validatesWith(function (a) {
        return a instanceof Axis;
    });

    Graph.respondsTo("doDragReset", function () {
        this.dragStarted(false);
        this.pauseAllData();
    });

    Graph.respondsTo("doDragDone", function () {
        this.resumeAllData();
    });

    Graph.respondsTo("doDrag", function (multigraph, bx, by, dx, dy, shiftKey) {
        var dragAxis        = this.dragAxis,
            dragOrientation = this.dragOrientation,
            HORIZONTAL = Axis.HORIZONTAL,
            VERTICAL   = Axis.VERTICAL;
        // TODO: this try...catch is just to remind myself how to apply, make sure this is correct later
        try {
            if (!this.dragStarted()) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    dragOrientation(HORIZONTAL);
                } else {
                    dragOrientation(VERTICAL);
                }
                dragAxis(this.findNearestAxis(bx, by, dragOrientation()));
                if (dragAxis() === null) {
                    dragOrientation( (dragOrientation() === HORIZONTAL) ? VERTICAL : HORIZONTAL );
                    dragAxis( this.findNearestAxis(bx, by, dragOrientation()) );
                }
                this.dragStarted(true);
            }

            // do the action
            if (shiftKey) {
                if (dragOrientation() === HORIZONTAL) {
                    dragAxis().doZoom(bx, dx);
                } else {
                    dragAxis().doZoom(by, dy);
                }
            } else {
                if (dragOrientation() === HORIZONTAL) {
                    dragAxis().doPan(bx, dx);
                } else {
                    dragAxis().doPan(by, dy);
                }
            }

            // draw everything
            multigraph.redraw();
        } catch (e) {
            errorHandler(e);
        }
    });

    return Graph;
};

},{"../../core/axis.js":19,"../../core/graph.js":40}],73:[function(require,module,exports){
module.exports = function($, window, errorHandler) {
    var Graph = require('../../core/graph.js'),
        Axis = require('../../core/axis.js');

    if (typeof(Graph.mouseWheelTimer)==="function") { return Graph; }

    Graph.hasA("mouseWheelTimer").which.defaultsTo(null);

    Graph.respondsTo("doWheelZoom", function (multigraph, x, y, delta) {
        var that = this;
        try {
            this.pauseAllData();
            var axis = this.findNearestAxis(x, y);
            if (axis.orientation() === Axis.HORIZONTAL) {
                axis.doZoom(x, 4*delta);
            } else {
                axis.doZoom(y, 4*delta);
            }
            multigraph.redraw();

            // resume data fetching after .5 seconds of no mouse wheel motion:
            var mouseWheelTimer = this.mouseWheelTimer;
            if (mouseWheelTimer() !== null) {
                window.clearTimeout(mouseWheelTimer());
                mouseWheelTimer(null);
            }
            mouseWheelTimer(window.setTimeout(function () {
                that.resumeAllData();
            }, 500)); 
        } catch (e) {
            errorHandler(e);
        }
    });

    return Graph;
};

},{"../../core/axis.js":19,"../../core/graph.js":40}],74:[function(require,module,exports){
module.exports = function($, window, errorHandler) {

    var Multigraph = require('../../core/multigraph.js')($),
        Point = require('../../math/point.js');

    if (typeof(Multigraph.registerMouseEvents)==="function") { return Multigraph; }

    Multigraph.respondsTo("registerMouseEvents", function (target) {
        var base,
            mouseLast,
            mouseIsDown = false,
            dragStarted = false,
            multigraph = this,
            $target = $(target);

        var eventLocationToGraphCoords = function (event) {
            return new Point((event.pageX - $target.offset().left) - multigraph.graphs().at(0).x0(),
                             $target.height() - (event.pageY - $target.offset().top) - multigraph.graphs().at(0).y0());
        };

        $target.mousedown(function (event) {
            event.preventDefault();
            mouseLast = base = eventLocationToGraphCoords(event);
            mouseIsDown = true;
            dragStarted = false;
        });

        $target.mouseup(function (event) {
            mouseIsDown = false;
            multigraph.graphs().at(0).doDragDone();
        });

        $target.mousemove(function (event) {
            var eventLoc = eventLocationToGraphCoords(event);
            if (mouseIsDown) {
                var dx = eventLoc.x() - mouseLast.x(),
                    dy = eventLoc.y() - mouseLast.y();
                if (multigraph.graphs().size() > 0) {
                    if (!dragStarted ) {
                        multigraph.graphs().at(0).doDragReset();
                    }
                    multigraph.graphs().at(0).doDrag(multigraph, base.x(), base.y(), dx, dy, event.shiftKey);
                }
                dragStarted = true;
            }
            mouseLast = eventLoc;
        });

        $target.mousewheel(function (event, delta) {
            var eventLoc = eventLocationToGraphCoords(event);
            if (multigraph.graphs().size() > 0) {
                multigraph.graphs().at(0).doWheelZoom(multigraph, eventLoc.x(), eventLoc.y(), delta);
            }
            event.preventDefault();
        });

        $target.mouseenter(function (event) {
            mouseLast = eventLocationToGraphCoords(event);
            mouseIsDown = false;
            multigraph.graphs().at(0).doDragDone();
        });

        $target.mouseleave(function (event) {
            mouseIsDown = false;
            multigraph.graphs().at(0).doDragDone();
        });

    });

    return Multigraph;
};

},{"../../core/multigraph.js":47,"../../math/point.js":103}],75:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
var _INCLUDED = false;
module.exports = function($, window, errorHandler) {

    if (_INCLUDED) { return; } else { _INCLUDED = true; }
    
    var Multigraph = require('../core/multigraph.js')($);

    var methods = {
        multigraph : function () {
            return this.data('multigraph').multigraph;
        },

        done : function (func) {
            return this.each(function () {
                return $(this).data('multigraph').multigraph.done(func);
            });
        },

        init : function (options) {
            return this.each(function () {
                var $this = $(this),
                    data = $this.data('multigraph');
                options.div = this;
                if ( ! data ) {
                    $this.data('multigraph', {
                        multigraph : Multigraph.createGraph(options)
                    });
                }
                return this;
            });
        }
    };

    $.fn.multigraph = function (method) {
        if ( methods[method] ) {
            return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof method === 'object' || ! method ) {
            return methods.init.apply( this, arguments );
        } else {
            $.error( 'Method ' +  method + ' does not exist on jQuery.multigraph' );
            return null;
        }    
    };

    /*
     * Inclusion of this file allows markup like the following to be
     * used in HTML:
     * 
     *     <div class="multigraph"
     *        data-src="MUGL_FILE"
     *        data-width="WIDTH"
     *        data-height="HEIGHT"
     *        data-driver="DRIVER">
     *     </div>
     * 
     * The data-driver tag is optional; if not specified, it currently
     * defaults to "canvas", but that will be changed in the future to
     * make a smart choice based on browser capabilities.
     * 
     * The data-width and data-height tags are also optional; if they
     * are not specified, Multigraph will use the div size as determined
     * by the browser (which may be set by css rules, for example).  If
     * data-width or data-height is present, it will override any css
     * width or height.
     * 
     */
    $(document).ready(function () {

        $("div.multigraph").each(function () {

            var width  = $(this).attr("data-width"),
                height = $(this).attr("data-height"),
                src    = $(this).attr("data-src"),
                driver = $(this).attr("data-driver"),
                options;

            if (width !== undefined) {
                $(this).css('width', width + 'px');
            }
            if (height !== undefined) {
                $(this).css('height', height + 'px');
            }

            /*
             // don't default to canvas here any more; Multigraph.createGraph now does
             // browser detection and will default to canvas if possible, otherwise
             // to raphael
             if (driver === undefined) {
             driver = "canvas";
             }
             */

            options = {
                'div'    : this,
                'mugl'   : src,
                'driver' : driver
            };

            $(this).multigraph(options);
            $(this).lightbox({
                scale : true,
                postopen : function () {
                    var lightboxData = this.data("lightbox");
                    lightboxData.originalDiv = this;
                    this.data("multigraph").multigraph.done(function (m) {
                        m.div(lightboxData.contents);
                        m.initializeSurface();
                        m.resizeSurface(lightboxData.contentWidth, lightboxData.contentHeight);
                        m.width(lightboxData.contentWidth)
                            .height(lightboxData.contentHeight);
                        m.busySpinner().remove();
                        m.busySpinner($('<div style="position: absolute; left:5px; top:5px;"></div>')
                                      .appendTo($(m.div()))
                                      .busy_spinner());
                        m.render();
                    });
                    var timeout= window.setTimeout(function () {
                        lightboxData.contents.lightbox("resize");
                        window.clearTimeout(timeout);
                    }, 50);
                },
                postclose : function () {
                    var lightboxData = this.data("lightbox");
                    this.data("multigraph").multigraph.done(function (m) {
                        m.div(lightboxData.originalDiv)
                            .width($(m.div()).width())
                            .height($(m.div()).height())
                            .busySpinner($('<div style="position: absolute; left:5px; top:5px;"></div>')
                                         .appendTo($(m.div()))
                                         .busy_spinner()
                                        );

                        m.initializeSurface();
                        m.render();
                    });
                },
                postresize : function () {
                    var lightboxData = this.data("lightbox");
                    this.data("multigraph").multigraph.done(function (m) {
                        m.resizeSurface(lightboxData.contentWidth, lightboxData.contentHeight);
                        m.width(lightboxData.contentWidth)
                            .height(lightboxData.contentHeight);
                        m.render();
                    });
                }
            });

        });

    });

};

},{"../core/multigraph.js":47}],76:[function(require,module,exports){
module.exports = function($, window, errorHandler) {
    var Graph = require('../../core/graph.js'),
        Axis = require('../../core/axis.js');

    if (typeof(Graph.doFirstPinchZoom)==="function") { return Graph; }

    Graph.respondsTo("doFirstPinchZoom", function (multigraph, bx, by, dx, dy, totalx, totaly) {
        var dragAxis = this.dragAxis,
            dragOrientation = this.dragOrientation,
            HORIZONTAL = Axis.HORIZONTAL,
            VERTICAL   = Axis.VERTICAL;

        // TODO: this try...catch is just to remind myself how to apply, make sure this is correct later
        try {
            if (!this.dragStarted()) {
                if (totalx > totaly) {
                    dragOrientation(HORIZONTAL);
                } else {
                    dragOrientation(VERTICAL);
                }
                dragAxis(this.findNearestAxis(bx, by, dragOrientation()));
                if (dragAxis() === null) {
                    dragOrientation( (dragOrientation() === HORIZONTAL) ? VERTICAL : HORIZONTAL );
                    dragAxis( this.findNearestAxis(bx, by, dragOrientation()) );
                }
                this.dragStarted(true);
            }

            // do the action
            if (dragOrientation() === HORIZONTAL) {
                dragAxis().doZoom(bx, dx);
            } else {
                dragAxis().doZoom(by, dy);
            }

            // draw everything
            multigraph.redraw();
        } catch (e) {
            errorHandler(e);
        }
    });

    return Graph;
};

},{"../../core/axis.js":19,"../../core/graph.js":40}],77:[function(require,module,exports){
module.exports = function($, window, errorHandler) {
    var Multigraph = require('../../core/multigraph.js')($),
        Point = require('../../math/point.js');

    if (typeof(Multigraph.registerTouchEvents)==="function") { return Multigraph; }

    Multigraph.respondsTo("registerTouchEvents", function (target) {
        var touchStarted           = false,
            dragStarted            = false,
            pinchZoomStarted       = false,
            pinchZoomDetermined    = false,
            pinchZoomInitialDeltas = {},
            pinchZoomDeterminedTimeout,
            previoustoucha, previoustouchb,
            base,
            multigraph = this,
            $target = $(target);

        var touchLocationToGraphCoords = function (touch) {
            return new Point((touch.pageX - $target.offset().left) - multigraph.graphs().at(0).x0(),
                             $target.height() - (touch.pageY - $target.offset().top) - multigraph.graphs().at(0).y0());
        };

        var handleTouchStart = function (jqueryEvent) {
            var e = jqueryEvent.originalEvent;
            e.preventDefault();

            if (e.touches.length === 1) {
                base = touchLocationToGraphCoords(e.touches[0]);
            }
            previoustoucha = touchLocationToGraphCoords(e.touches[0]);

            // one finger drag
            if (e.touches.length === 1) {
                dragStarted = true;
            } else {
                dragStarted = false;
            }

            // pinch zoom
            if (e.touches.length === 2) {
                pinchZoomStarted = true;
                pinchZoomDetermined = false;
                previoustouchb = touchLocationToGraphCoords(e.touches[1]);
            } else {
                pinchZoomStarted = false;
                pinchZoomDetermined = false;
            }

            touchStarted = false;
            multigraph.graphs().at(0).doDragDone();
        };

        var handleTouchMove = function (jqueryEvent) {
            var e = jqueryEvent.originalEvent;
            e.preventDefault();

            // one finger drag
            if (e.touches.length === 1 && dragStarted === true) {
                handleDrag(e);
            }
            // pinch zoom
            if (e.touches.length === 2 && pinchZoomStarted === true) {
                handlePinchZoom(e);
            }
        };

        var handleTouchEnd = function (jqueryEvent) {
            var e = jqueryEvent.originalEvent;
            e.preventDefault();
            
            // one finger drag
            if (e.touches.length === 1) {
                dragStarted = true;
            } else {
                dragStarted = false;
            }
            
            // pinch zoom
            if (e.touches.length === 2) {
                pinchZoomStarted = true;
                pinchZoomDetermined = false;
            } else {
                pinchZoomStarted = false;
                pinchZoomDetermined = false;
            }

            touchStarted = false;
            multigraph.graphs().at(0).doDragDone();
        };

        var handleTouchLeave = function (jqueryEvent) {
            jqueryEvent.originalEvent.preventDefault();

            dragStarted = false;
            pinchZoomStarted = false;
            pinchZoomDetermined = false;
            touchStarted = false;

            multigraph.graphs().at(0).doDragDone();
        };

        var handleDrag = function (e) {
            var touchLoc = touchLocationToGraphCoords(e.touches[0]),
                dx = touchLoc.x() - previoustoucha.x(),
                dy = touchLoc.y() - previoustoucha.y();
            if (multigraph.graphs().size() > 0) {
                if (!touchStarted) {
                    multigraph.graphs().at(0).doDragReset();
                }
                multigraph.graphs().at(0).doDrag(multigraph, base.x(), base.y(), dx, dy, false);
            }
            touchStarted = true;
            previoustoucha = touchLoc;
        };

        var handlePinchZoom = function (e) {
            var a = touchLocationToGraphCoords(e.touches[0]),
                b = touchLocationToGraphCoords(e.touches[1]),
                basex = (a.x() + b.x()) / 2,
                basey = (a.y() + b.y()) / 2,
                dx = calculateAbsoluteDistance(a.x(), b.x()) - calculateAbsoluteDistance(previoustoucha.x(), previoustouchb.x()),
                dy = calculateAbsoluteDistance(a.y(), b.y()) - calculateAbsoluteDistance(previoustoucha.y(), previoustouchb.y());

            if (multigraph.graphs().size() > 0) {
                if (!touchStarted) {
                    multigraph.graphs().at(0).doDragReset();
                }
                if (pinchZoomDetermined === true) {
                    multigraph.graphs().at(0).doDrag(multigraph, basex, basey, dx, dy, true);
                }
            }
            touchStarted = true;

            // two finger scroll
            var cx = ((a.x() - previoustoucha.x()) + (b.x() - previoustouchb.x())) / 2,
                cy = ((a.y() - previoustoucha.y()) + (b.y() - previoustouchb.y())) / 2;
            if (pinchZoomDetermined === true) {
                multigraph.graphs().at(0).doDrag(multigraph, basex, basey, cx, cy, false);
            }

            if (pinchZoomDetermined === false) {
                if (pinchZoomInitialDeltas.base === undefined) {
                    pinchZoomInitialDeltas.base = {};
                    pinchZoomInitialDeltas.base.x = basex;
                    pinchZoomInitialDeltas.base.y = basey;
                } 
                if (pinchZoomInitialDeltas.zoomDeltas === undefined) {
                    pinchZoomInitialDeltas.zoomDeltas = {
                        "dx"     : 0,
                        "dy"     : 0,
                        "totalx" : 0,
                        "totaly" : 0
                    };
                }
                if (pinchZoomInitialDeltas.panDeltas === undefined) {
                    pinchZoomInitialDeltas.panDeltas = {
                        "dx" : 0,
                        "dy" : 0
                    };
                }

                pinchZoomInitialDeltas.zoomDeltas.dx += dx;
                pinchZoomInitialDeltas.zoomDeltas.dy += dy;
                pinchZoomInitialDeltas.panDeltas.dx += cx;
                pinchZoomInitialDeltas.panDeltas.dy += cy;

                pinchZoomInitialDeltas.zoomDeltas.totalx += Math.abs(dx);
                pinchZoomInitialDeltas.zoomDeltas.totaly += Math.abs(dy);

                if (pinchZoomDeterminedTimeout === undefined) {
                    pinchZoomDeterminedTimeout = setTimeout(function () {
                        var basex = pinchZoomInitialDeltas.base.x,
                            basey = pinchZoomInitialDeltas.base.y,
                            dx = pinchZoomInitialDeltas.zoomDeltas.dx,
                            dy = pinchZoomInitialDeltas.zoomDeltas.dy,
                            cx = pinchZoomInitialDeltas.panDeltas.dx,
                            cy = pinchZoomInitialDeltas.panDeltas.dy;

                        multigraph.graphs().at(0).doDragReset();

                        multigraph.graphs().at(0).doFirstPinchZoom(multigraph, basex, basey, dx, dy, pinchZoomInitialDeltas.zoomDeltas.totalx, pinchZoomInitialDeltas.zoomDeltas.totaly);
                        multigraph.graphs().at(0).doDrag(multigraph, basex, basey, cx, cy, false);

                        pinchZoomInitialDeltas = {};
                        pinchZoomDetermined = true;
                        clearTimeout(pinchZoomDeterminedTimeout);
                        pinchZoomDeterminedTimeout = undefined;
                    }, 60);
                }
            }

            previoustoucha = a;
            previoustouchb = b;

        };

        var calculateAbsoluteDistance = function (a, b) {
            return Math.abs(a - b);
        };

        $target.on("touchstart", handleTouchStart);
        $target.on("touchmove", handleTouchMove);
        $target.on("touchend", handleTouchEnd);
        $target.on("touchleave", handleTouchLeave);

    });

    return Multigraph;
};

},{"../../core/multigraph.js":47,"../../math/point.js":103}],78:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function($, window) {
    if (_INCLUDED) { return; }
    _INCLUDED = true;

    require('./multigraph.js')($, window);

    require('./axis.js')();
    require('./axis_title.js')();
    require('./background.js')();
    require('./graph.js')();
    require('./graph_title.js')();
    require('./icon.js')();
    require('./img.js')();
    require('./labeler.js')();
    require('./legend.js')();
    require('./plotarea.js')();
    require('./renderers/band_renderer.js')();
    require('./renderers/bar_renderer.js')();
    require('./renderers/fill_renderer.js')();
    require('./renderers/pointline_renderer.js')();
    require('./renderers/rangebar_renderer.js')();
    require('./text.js')();
    require('./window.js')();
};

},{"./axis.js":79,"./axis_title.js":80,"./background.js":81,"./graph.js":82,"./graph_title.js":83,"./icon.js":84,"./img.js":85,"./labeler.js":86,"./legend.js":87,"./multigraph.js":88,"./plotarea.js":89,"./renderers/band_renderer.js":90,"./renderers/bar_renderer.js":91,"./renderers/fill_renderer.js":92,"./renderers/pointline_renderer.js":93,"./renderers/rangebar_renderer.js":94,"./text.js":95,"./window.js":96}],79:[function(require,module,exports){
module.exports = function() {
    var Axis = require('../../core/axis.js');

    if (typeof(Axis.renderGrid)==="function") { return Axis; }

    Axis.respondsTo("renderGrid", function (graph, context) {
        this.prepareRender(context);

        // draw the grid lines
        if (this.hasDataMin() && this.hasDataMax()) { // skip if we don't yet have data values
            if (this.grid().visible()) { // skip if grid lines aren't turned on
                if (this.labelers().size() > 0 && this.currentLabelDensity() <= 1.5) {
                    var currentLabeler = this.currentLabeler(),
                        perpOffset     = this.perpOffset(),
                        plotBox        = graph.plotBox();
                    currentLabeler.prepare(this.dataMin(), this.dataMax());
                    context.beginPath();
                    while (currentLabeler.hasNext()) {
                        var v = currentLabeler.next(),
                            a = this.dataValueToAxisValue(v);
                        if (this.orientation() === Axis.HORIZONTAL) {
                            context.moveTo(a, perpOffset);
                            context.lineTo(a, plotBox.height() - perpOffset);
                        } else {
                            context.moveTo(perpOffset, a);
                            context.lineTo(plotBox.width() - perpOffset, a);
                        }
                    }
                    context.strokeStyle = this.grid().color().getHexString("#");
                    context.stroke();
                }
            }
        }
    });

    Axis.respondsTo("render", function (graph, context) {
        var parallelOffset = this.parallelOffset(),
            perpOffset     = this.perpOffset(),
            pixelLength    = this.pixelLength(),
            currentLabeler = this.currentLabeler(),
            axisIsHorizontal = (this.orientation() === Axis.HORIZONTAL);
        //NOTE: axes are drawn relative to the graph's plot area (plotBox); the coordinates
        //      below are relative to the coordinate system of that box.

        //
        // Render the axis line itself, unless its linewidth() property is 0.
        // TODO: modify this so that it correctly draws a line with the given
        // linewidth().  At the moment, it only makes a distinction between
        // lines of width 0, which aren't drawn at all, and lines with width > 0,
        // which are drawn with width 1.
        if (this.linewidth() > 0) {
            context.beginPath();
            if (axisIsHorizontal) {
                context.moveTo(parallelOffset, perpOffset);
                context.lineTo(parallelOffset + pixelLength, perpOffset);
            } else {
                context.moveTo(perpOffset, parallelOffset);
                context.lineTo(perpOffset, parallelOffset + pixelLength);
            }

            context.strokeStyle = this.color().getHexString("#");
            context.stroke();
        }

        //
        // Render the tick marks and labels
        //
        if (this.hasDataMin() && this.hasDataMax()) { // but skip if we don't yet have data values
            if (currentLabeler && currentLabeler.visible()) { // also skip if we have no current labeler, or
                var tickwidth = this.tickwidth(),             //   if we do but its `visible` property is false
                    tickmin   = this.tickmin(),
                    tickmax   = this.tickmax(),
                    tickcolor = this.tickcolor();
                context.beginPath();
                context.fillStyle = '#000000';
                currentLabeler.prepare(this.dataMin(), this.dataMax());
                while (currentLabeler.hasNext()) {
                    var v = currentLabeler.next(),
                        a = this.dataValueToAxisValue(v);
                    if (tickwidth > 0) {
                        if (tickcolor !== undefined && tickcolor !== null) {
                            context.strokeStyle = tickcolor.getHexString('#');
                        }
                        if (axisIsHorizontal) {
                            context.moveTo(a, perpOffset+tickmax);
                            context.lineTo(a, perpOffset+tickmin);
                        } else {
                            context.moveTo(perpOffset+tickmin, a);
                            context.lineTo(perpOffset+tickmax, a);
                        }
                        if (tickcolor !== undefined && tickcolor !== null) {
                            context.restore();
                        }
                    }
                    currentLabeler.renderLabel(context, v);
                }
                context.stroke();
            }
        }

        //
        // Render the title
        //
        if (this.title()) {
            this.title().render(context);
        }

    });

    return Axis;
};

},{"../../core/axis.js":19}],80:[function(require,module,exports){
module.exports = function() {
    var AxisTitle = require('../../core/axis_title.js'),
        Axis = require('../../core/axis.js'),
        Point = require('../../math/point.js');

    if (typeof(AxisTitle.render)==="function") { return AxisTitle; }

    AxisTitle.respondsTo("render", function (context) {
        var axis        = this.axis(),
            title       = this.content(),
            anchor      = this.anchor(),
            perpOffset  = axis.perpOffset(),
            h           = title.origHeight(),
            w           = title.origWidth(),
            pixelAnchor = new Point(
                0.5 * w * (anchor.x() + 1),
                0.5 * h * (anchor.y() + 1)
            ),
            storedBase  = (this.base() + 1) * (axis.pixelLength() / 2) + axis.minoffset() + axis.parallelOffset(),
            pixelBase;

        if (axis.orientation() === Axis.HORIZONTAL) {
            pixelBase = new Point(storedBase, perpOffset);
        } else {
            pixelBase = new Point(perpOffset, storedBase);
        }

        context.save();
        context.fillStyle = "rgba(0, 0, 0, 1)";
        title.drawText(context, pixelAnchor, pixelBase, this.position(), this.angle());
        context.restore();
    });

    return AxisTitle;
};

},{"../../core/axis.js":19,"../../core/axis_title.js":21,"../../math/point.js":103}],81:[function(require,module,exports){
module.exports = function() {
    var Background = require('../../core/background.js');

    if (typeof(Background.render)==="function") { return Background; }

    Background.respondsTo("render", function (graph, context, width, height) {
        var mb = graph.window().margin().left() + graph.window().border(),
            img = this.img();

        context.save();
        context.fillStyle = this.color().getHexString("#");
        context.fillRect(mb, mb, width - 2*mb, height - 2*mb);
        context.restore();
        
        if (img && img.src() !== undefined) {
            img.render(graph, context, width, height);
        }
    });

    return Background;
};

},{"../../core/background.js":22}],82:[function(require,module,exports){
module.exports = function() {
    var Graph = require('../../core/graph.js');

    if (typeof(Graph.render)==="function") { return Graph; }

    Graph.respondsTo("render", function (context, width, height) {
        var i;

        this.window().render(context, width, height);

        this.background().render(this, context, width, height);

        context.transform(1,0,0,1,this.x0(),this.y0());

        this.plotarea().render(this, context);

        for (i = 0; i < this.axes().size(); ++i) {
            this.axes().at(i).renderGrid(this, context);
        }


        context.save();
        context.rect(0, 0, this.plotBox().width(), this.plotBox().height());
        context.clip();


        for (i = 0; i < this.plots().size(); ++i) {
            this.plots().at(i).render(this, context);
        }

        context.restore();

        for (i = 0; i < this.axes().size(); ++i) {
            this.axes().at(i).render(this, context);
        }

        this.legend().render(context);

        if (this.title()) {
            this.title().render(context);
        }
    });

    return Graph;
};

},{"../../core/graph.js":40}],83:[function(require,module,exports){
module.exports = function() {
    var Title = require('../../core/title.js'),
        Point = require('../../math/point.js');

    if (typeof(Title.render)==="function") { return Title; }

    Title.respondsTo("render", function (context) {
        var graph           = this.graph(),
            border          = this.border(),
            padding         = this.padding(),
            storedAnchor    = this.anchor(),
            storedBase      = this.base(),
            position        = this.position(),
            title           = this.text(),
            backgroundColor = this.color().toRGBA(this.opacity()),
            paddingBox      = graph.paddingBox(),
            plotBox         = graph.plotBox(),
            plotareaMargin  = graph.plotarea().margin(),
            h = title.origHeight(),
            w = title.origWidth(),
            pixelAnchor = new Point(
                (0.5 * w + padding + border) * (storedAnchor.x() + 1),
                (0.5 * h + padding + border) * (storedAnchor.y() + 1)
            ),
            pixelBase;

        if (this.frame() === "padding") {
            pixelBase = new Point(
                (storedBase.x() + 1) * (paddingBox.width() / 2)  - plotareaMargin.left(),
                (storedBase.y() + 1) * (paddingBox.height() / 2) - plotareaMargin.bottom()
            );
        } else {
            pixelBase = new Point(
                (storedBase.x() + 1) * (plotBox.width() / 2),
                (storedBase.y() + 1) * (plotBox.height() / 2)
            );
        }

        context.save();
        title.setTransform(context, pixelAnchor, pixelBase, position, 0);
        context.transform(1, 0, 0, -1, 0, 0);

        // border
        if (border > 0) {
            context.strokeStyle = this.bordercolor().toRGBA();
            context.lineWidth = border;
            context.strokeRect(
                border / 2,
                border / 2,
                w + (2 * padding) + border,
                h + (2 * padding) + border
            );
        }

        // background
        context.fillStyle = backgroundColor;
        context.fillRect(
            border,
            border,
            w + (2 * padding),
            h + (2 * padding)
        );
        context.restore();

        // text
        context.save();
        var textPosition = new Point(
            position.x() + border + padding,
            position.y() + border + padding
        );
        context.font = this.fontSize() + " sans-serif";
        context.fillStyle = "rgba(0, 0, 0, 1)";
        title.drawText(context, pixelAnchor, pixelBase, textPosition, 0);
        context.restore();
    });

    return Title;
};

},{"../../core/title.js":64,"../../math/point.js":103}],84:[function(require,module,exports){
module.exports = function() {
    var Icon = require('../../core/icon.js'),
        Point = require('../../math/point.js');

    if (typeof(Icon.renderBorder)==="function") { return Icon; }

    Icon.respondsTo("renderBorder", function (context, x, y) {
        context.save();
        context.strokeStyle = "rgba(0, 0, 0, 1)";
        context.strokeRect(x, y, this.width(), this.height());
        context.restore();
    });
    return Icon;
};

},{"../../core/icon.js":42,"../../math/point.js":103}],85:[function(require,module,exports){
module.exports = function() {
    var Img = require('../../core/img.js'),
        Util = require('../../math/util.js');

    if (typeof(Img.render)==="function") { return Img; }

    Img.hasA("image").which.defaultsTo(function () {return new Image();});
    Img.hasA("fetched").which.defaultsTo(false);

    Img.respondsTo("render", function (graph, context, width, height) {
        if (this.fetched()) {
            var interp      = Util.interp,
                image       = this.image(),
                graphWindow = graph.window(),
                plotarea    = graph.plotarea(),
                base = this.base(),
                ax = interp(this.anchor().x(), -1, 1, 0, image.width),
                ay = interp(this.anchor().y(), 1, -1, 0, image.height),
                paddingLeft = graphWindow.margin().left() + graphWindow.border(),
                paddingTop  = graphWindow.margin().top() + graphWindow.border(),
                plotLeft = paddingLeft + graphWindow.padding().left() + plotarea.margin().left() + plotarea.border(),
                plotTop  = paddingTop + graphWindow.padding().top() + plotarea.margin().top() + plotarea.border(),
                bx, by,
                x, y;
            if (this.frame() === Img.PLOT) {
                bx = plotLeft + interp(base.x(), -1, 1, 0, graph.plotBox().width());
                by = plotTop + interp(base.y(), 1, -1, 0, graph.plotBox().height());
            } else {
                bx = paddingLeft + interp(base.x(), -1, 1, 0, graph.paddingBox().width());
                by = paddingTop + interp(base.y(), 1, -1, 0, graph.paddingBox().height());
            }
            x = bx + this.position().x() - ax;
            y = by + this.position().y() - ay;
            context.save();
            context.transform(1, 0, 0, -1, 0, height);
            context.drawImage(image, x, y, image.width, image.height);
            context.restore();
        } else {
            var that = this;
            this.image().onload = function () {
                that.fetched(true);
                context.save();
                context.setTransform(1, 0, 0, -1, 0, height);
                graph.render(context, width, height);
                context.restore();
            };
            this.image().src = this.src();
        }
    });

    return Img;
};

},{"../../core/img.js":43,"../../math/util.js":105}],86:[function(require,module,exports){
module.exports = function() {
    var Labeler = require('../../core/labeler.js'),
        Text = require('../../core/text.js'),
        Axis = require('../../core/axis.js'),
        Point = require('../../math/point.js');

    if (typeof(Labeler.renderLabel)==="function") { return Labeler; }

    Labeler.respondsTo("measureStringWidth", function (context, string) {
        return (new Text(string)).initializeGeometry({
            "context" : context,
            "angle"   : this.angle()
        }).rotatedWidth();
    });

    Labeler.respondsTo("measureStringHeight", function (context, string) {
        return (new Text(string)).initializeGeometry({
            "context" : context,
            "angle"   : this.angle()
        }).rotatedHeight();
    });

    Labeler.respondsTo("renderLabel", function (context, value) {
        var axis            = this.axis(),
            storedAnchor    = this.anchor(),
            angle           = this.angle(),
            perpOffset      = axis.perpOffset(),
            a               = axis.dataValueToAxisValue(value),
            formattedString = new Text(this.formatter().format(value)),
            pixelAnchor,
            base;

        formattedString.initializeGeometry({
            "context" : context,
            "angle"   : angle
        });

        pixelAnchor = new Point(
            0.5 * formattedString.origWidth() * (storedAnchor.x() + 1),
            0.5 * formattedString.origHeight() * (storedAnchor.y() + 1)
        );

        if (axis.orientation() === Axis.HORIZONTAL) {
            base = new Point(a, perpOffset);
        } else {
            base = new Point(perpOffset, a);
        }


        context.save();
        context.fillStyle = this.color().getHexString("#");
        formattedString.drawText(context, pixelAnchor, base, this.position(), angle);
        context.restore();
    });

    return Labeler;
};

},{"../../core/axis.js":19,"../../core/labeler.js":44,"../../core/text.js":63,"../../math/point.js":103}],87:[function(require,module,exports){
module.exports = function() {
    var Legend = require('../../core/legend.js'),
        Point = require('../../math/point.js');

    if (typeof(Legend.renderLegend)==="function") { return Legend; }

    Legend.respondsTo("begin", function (context) {
        context.save();
        context.transform(1, 0, 0, 1, this.x(), this.y());
    });

    Legend.respondsTo("end", function (context) {
        context.restore();
    });

    Legend.respondsTo("renderLegend", function (context) {
        var border = this.border();
        context.save();
        if (border > 0) {
            context.strokeStyle = this.bordercolor().toRGBA();
            context.strokeRect(border/2, border/2, this.width() - border/2, this.height() - border/2);
        }

        context.fillStyle = this.color().toRGBA(this.opacity());
        context.fillRect(border, border, this.width() - (2 * border), this.height() - (2 * border));
        context.restore();
    });

    Legend.respondsTo("renderLabel", function (label, context, x, y) {
        context.save();
        context.fillStyle = "rgba(0, 0, 0, 1)";
        context.transform(1, 0, 0, -1, 0, y + this.maxLabelHeight()/2 - label.origHeight()/2);
        context.fillText(label.string(), x, 0);
        context.restore();
    });

    return Legend;
};

},{"../../core/legend.js":45,"../../math/point.js":103}],88:[function(require,module,exports){
module.exports = function($, window) {
    var Multigraph = require('../../core/multigraph.js')($),
        Point = require('../../math/point.js');

    if (typeof(Multigraph.render)==="function") { return Multigraph; }

    Multigraph.hasA("canvas");  // canvas object itself (the '<canvas>' tag itself)
    Multigraph.hasA("context"); // canvas context object
    Multigraph.hasA("width").which.isA("number");
    Multigraph.hasA("height").which.isA("number");

    Multigraph.respondsTo("redraw", function () {
        var that = this;
        window.requestAnimationFrame(function () {
            that.render();
        });
    });

    Multigraph.respondsTo("init", function () {
        var $div = $(this.div());
        this.width($div.width());
        this.height($div.height());
        if (this.width() > 0 && this.height() > 0) {
            // create the canvas
            $("<canvas width=\""+this.width()+"\" height=\""+this.height()+"\"/>")
                .appendTo($div);

            this.initializeSurface();

            this.busySpinner($('<div style="position:absolute;top:50%;left:50%;margin-top:-16px;margin-left:-16px"></div>') .
                             appendTo($div) .
                             busy_spinner());
        }
        this.render();
    });

    Multigraph.respondsTo("render", function () {
        var context = this.context(),
            width   = this.width(),
            height  = this.height(),
            i;
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.transform(1, 0, 0, -1, 0, height);
        context.clearRect(0, 0, width, height);
        this.initializeGeometry(width, height, {"context" : context});
        for (i = 0; i < this.graphs().size(); ++i) {
            this.graphs().at(i).render(context, width, height);
        }
    });

    Multigraph.respondsTo("registerEvents", function () {
        var canvas = this.canvas();
        this.registerMouseEvents(canvas);
        this.registerTouchEvents(canvas);
    });

    Multigraph.respondsTo("resizeSurface", function (width, height) {
        var canvas = this.context().canvas;
        canvas.width  = width;
        canvas.height = height;
    });

    Multigraph.respondsTo("initializeSurface", function () {
        this.canvas($(this.div()).children("canvas")[0]);
        this.context(this.canvas().getContext("2d"));
    });

    //    var applyMixins = function (options) {
    //        var errorHandler = options.messageHandler.error;
    //        window.multigraph.parser.mixin.apply(window.multigraph, "parseXML");
    //        ns.mixin.apply(window.multigraph.core);
    //        window.multigraph.events.draggable.mixin.apply(window.multigraph, errorHandler);
    //        window.multigraph.events.mouse.mixin.apply(window.multigraph, errorHandler);
    //        window.multigraph.events.touch.mixin.apply(window.multigraph, errorHandler);
    //        window.multigraph.normalizer.mixin.apply(window.multigraph.core);
    //    };

    var generateInitialGraph = function (mugl, options) {
        var JQueryXMLParser = require('../../parser/jquery_xml_parser.js')($);
        var xmlObj = JQueryXMLParser.stringToJQueryXMLObj(mugl);
        var multigraph = Multigraph.parseXML( xmlObj, options.mugl, options.messageHandler );
        multigraph.normalize();
        multigraph.div(options.div);
        $(options.div).css("cursor" , "pointer");
        multigraph.init();
        multigraph.registerEvents();
        multigraph.registerCommonDataCallback(function (event) {
            multigraph.redraw();
        });
        return multigraph;
    };

    Multigraph.createCanvasGraph = function (options) {
        var muglPromise,
            deferred;

        try {
            //applyMixins(options);
            require('../../events/all.js')($, window, options.messageHandler.error);
            muglPromise = $.ajax({
                "url"      : options.mugl,
                "dataType" : "text"
            });

            deferred = $.Deferred();
        } catch (e) {
            options.messageHandler.error(e);
        }

        muglPromise.done(function (data) {
            try {
                // TODO: div size IS available here; see below.  What's going on???!!!
                var multigraph = generateInitialGraph(data, options);
                deferred.resolve(multigraph);
            } catch (e) {
                options.messageHandler.error(e);
            }
        });

        return deferred.promise();
    };

    Multigraph.createCanvasGraphFromString = function (options) {
        var deferred;
        
        try {
            //applyMixins(options);
            require('../../events/all.js')($, window, options.messageHandler.error);
            deferred = $.Deferred();
            // TODO: figure this out!  div size is not available here?  Apparently, at this point in
            // code execution, the browser hasn't laid things out enough for the div to have been
            // assigned a size, at least sometimes???  But it IS available at the corresponding place in
            // createCanvasGraph above?  This is worked around by the code in
            // src/core/multigraph.js:createGraph() that forces the div to have the size specified in
            // the options --- so we can work around the problem by passing an explicit size in the
            // options.  But we need to really figure out what's going on and resolve it.
            var multigraph = generateInitialGraph(options.muglString, options);
            deferred.resolve(multigraph);
        } catch (e) {
            options.messageHandler.error(e);
        }

        return deferred.promise();
    };

    return Multigraph;
};


},{"../../core/multigraph.js":47,"../../events/all.js":71,"../../math/point.js":103,"../../parser/jquery_xml_parser.js":119}],89:[function(require,module,exports){
module.exports = function() {
    var Plotarea = require('../../core/plotarea.js');

    if (typeof(Plotarea.render)==="function") { return Plotarea; }

    Plotarea.respondsTo("render", function (graph, context) {
        var plotBox = graph.plotBox(),
            border = this.border();

        if (this.color() !== null) {
            context.save();
            context.fillStyle = this.color().getHexString("#");
            context.fillRect(0, 0, plotBox.width(), plotBox.height());
            context.restore();
        }

        if (border > 0) {
            context.save();
            context.lineWidth = border;
            context.strokeStyle = this.bordercolor().getHexString("#");
            context.strokeRect(-border/2, -border/2, plotBox.width() + border, plotBox.height() + border);
            context.restore();
        }
    });

    return Plotarea;
};

},{"../../core/plotarea.js":55}],90:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function() {
    var BandRenderer = require('../../../core/renderers/band_renderer.js');

    if (_INCLUDED) { return BandRenderer; }
    _INCLUDED = true;

    // cached state object, for quick access during rendering, populated in begin() method:
    BandRenderer.hasA("state");

    BandRenderer.respondsTo("begin", function (context) {
        var state = {
            "context"            : context,
            "run"                : [],
            "linecolor"          : this.getOptionValue("linecolor"),
            "line1color"         : this.getOptionValue("line1color"),
            "line2color"         : this.getOptionValue("line2color"),
            "linewidth"          : this.getOptionValue("linewidth"),
            "line1width"         : this.getOptionValue("line1width"),
            "line2width"         : this.getOptionValue("line2width"),
            "fillcolor"          : this.getOptionValue("fillcolor"),
            "fillopacity"        : this.getOptionValue("fillopacity")
        };
        this.state(state);
    });

    // This renderer's dataPoint() method works by accumulating
    // and drawing one "run" of data points at a time.  A "run" of
    // points consists of a consecutive sequence of non-missing
    // data points which have the same fill color.  (The fill
    // color can change if the data line crosses the fill base
    // line, if the downfillcolor is different from the
    // fillcolor.)
    BandRenderer.respondsTo("dataPoint", function (datap) {
        var state = this.state();

        if (this.isMissing(datap)) {
            // if this is a missing point, render and reset the current run, if any
            if (state.run.length > 0) {
                this.renderRun();
                state.run = [];
            }
        } else {
            // otherwise, transform point to pixel coords
            var p = this.transformPoint(datap);
            // and add it to the current run
            state.run.push(p);
        }
    });

    BandRenderer.respondsTo("end", function () {
        var state = this.state();
        // render the current run, if any
        if (state.run.length > 0) {
            this.renderRun();
        }
    });

    /*
     * Private utility function to stroke line segments connecting the points of a run
     */
    var strokeRunLine = function(context, run, whichLine, color, defaultColor, width, defaultWidth) {
        var i;

        width = (width >= 0) ? width : defaultWidth;
        if (width > 0) {
            color = (color !== null) ? color : defaultColor;
            context.save();
            context.strokeStyle = color.getHexString("#");
            context.lineWidth = width;
            context.beginPath();
            context.moveTo(run[0][0], run[0][whichLine]);
            for (i = 1; i < run.length; ++i) {
                context.lineTo(run[i][0], run[i][whichLine]);
            }
            context.stroke();
            context.restore();
        }
    };

    // Render the current run of data points.  This consists of drawing the fill region
    // in the band between the two data lines, and connecting the points of each data line
    // with lines of the appropriate color.
    BandRenderer.respondsTo("renderRun", function () {
        var state   = this.state(),
            context = state.context,
            run     = state.run,
            i;

        // fill the run
        context.save();
        context.globalAlpha = state.fillopacity;
        context.fillStyle = state.fillcolor.getHexString("#");
        context.beginPath();
        // trace to the right along line 1
        context.moveTo(run[0][0], run[0][1]);
        for (i = 1; i < run.length; ++i) {
            context.lineTo(run[i][0], run[i][1]);
        }
        // trace back to the left along line 2
        context.lineTo(run[run.length-1][0], run[run.length-1][2]);
        for (i = run.length-1; i >= 0; --i) {
            context.lineTo(run[i][0], run[i][2]);
        }
        context.fill();
        context.restore();

        // stroke line1
        strokeRunLine(context, run, 1, state.line1color, state.linecolor, state.line1width, state.linewidth);

        // stroke line2
        strokeRunLine(context, run, 2, state.line2color, state.linecolor, state.line2width, state.linewidth);
    });

    BandRenderer.respondsTo("renderLegendIcon", function (context, x, y, icon) {
        var state = this.state(),
            iconWidth  = icon.width(),
            iconHeight = icon.height();

        context.save();
        context.transform(1, 0, 0, 1, x, y);

        context.save();
        // Draw icon background (with opacity)
        if (iconWidth < 10 || iconHeight < 10) {
            context.fillStyle = state.fillcolor.toRGBA();
        } else {
            context.fillStyle = "#FFFFFF";
        }
        context.fillRect(0, 0, iconWidth, iconHeight);
        context.restore();

        // Draw icon graphics
        context.strokeStyle = (state.line2color !== null) ? state.line2color : state.linecolor;
        context.lineWidth   = (state.line2width >= 0) ? state.line2width : state.linewidth;
        context.fillStyle   = state.fillcolor.toRGBA(state.fillopacity);

        context.beginPath();

        context.moveTo(0,         2*iconHeight/8);
        context.lineTo(0,         6*iconHeight/8);
        context.lineTo(iconWidth, 7*iconHeight/8);
        context.lineTo(iconWidth, 3*iconHeight/8);
        context.lineTo(0,         2*iconHeight/8);
        
        context.fill();
        context.stroke();

        context.restore();
    });

    return BandRenderer;
};

},{"../../../core/renderers/band_renderer.js":58}],91:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function() {
    var BarRenderer = require('../../../core/renderers/bar_renderer.js');

    if (_INCLUDED) { return BarRenderer; }
    _INCLUDED = true;

    // cached settings object, for quick access during rendering, populated in begin() method:
    BarRenderer.hasA("settings");

    BarRenderer.respondsTo("begin", function (context) {
        var settings = {
            "context"            : context,
            "barpixelwidth"      : this.getOptionValue("barwidth").getRealValue() * this.plot().horizontalaxis().axisToDataRatio(),
            "baroffset"          : this.getOptionValue("baroffset"),
            "barpixelbase"       : (this.getOptionValue("barbase") !== null)?this.plot().verticalaxis().dataValueToAxisValue(this.getOptionValue("barbase")):0,
            "fillcolor"          : this.getOptionValue("fillcolor"),
            "linecolor"          : this.getOptionValue("linecolor"),
            "hidelines"          : this.getOptionValue("hidelines"),
            "barGroups"          : [],
            "currentBarGroup"    : null,
            "prevCorner"         : null,
            "pixelEdgeTolerance" : 1
        };

        this.settings(settings);
    });

    // This bar renderer uses a somewhat sophisticated technique when drawing
    // the outlines around the bars, in order to make sure that it only draws
    // one vertical line between two bars that share an edge.  If a complete
    // outline were drawn around each bar separately, the common edge between
    // adjacent bars would get drawn twice, once for each bar, possibly in
    // slightly different locations on the screen due to roundoff error,
    // thereby making some of the outline lines appear thicker than others.
    // 
    // In order to avoid this roundoff artifact, this render only draws the
    // bars (the filled region of the bar, that is) in its dataPoint() method,
    // and keeps a record of the bar locations and heights so that it can draw all
    // of the bar outlines at once, in its end() method.  The bar locations and
    // heights are stored in an array called _barGroups, which is an array of
    // "bar group" objects.  Each "bar group" corresponds to a sequence of adjacent
    // bars --- two bars are considered to be adjacent if the right edge of the left
    // bar is within _pixelEdgeTolerance pixels of the left edge of the right bar.
    // A "bar group" is represented by an array of points representing the pixel
    // coordinates of the upper left corners of all the bars in the group, followed by
    // the pixel coordinates of the upper right corner of the right-most bar in the group.
    // (The last, right-most, bar is the only one whose upper right corner is included
    // in the list).  So, for example, the following bar group
    // 
    //        *--*
    //        |  |--*
    //     *--*  |  |
    //     |  |  |  |
    //     |  |  |  |
    //   ---------------
    //     1  2  3  4
    // 
    // would be represented by the array
    //
    //    [ [1,2], [2,3], [3,3], [4,3] ]
    //
    
    BarRenderer.respondsTo("dataPoint", function (datap) {
        if (this.isMissing(datap)) {
            return;
        }

        var settings = this.settings(),
            context  = settings.context,
            p  = this.transformPoint(datap),
            x0 = p[0] + settings.baroffset,
            x1 = p[0] + settings.baroffset + settings.barpixelwidth;

        context.save();
        context.fillStyle = this.getOptionValue("fillcolor", datap[1]).getHexString("#");
        context.fillRect(x0, settings.barpixelbase, settings.barpixelwidth, p[1] - settings.barpixelbase);
        context.restore();

        if (settings.barpixelwidth > settings.hidelines) {
            if (settings.prevCorner === null) {
                settings.currentBarGroup = [ [x0,p[1]] ];
            } else {
                if (Math.abs(x0 - settings.prevCorner[0]) <= settings.pixelEdgeTolerance) {
                    settings.currentBarGroup.push( [x0,p[1]] );
                } else {
                    settings.currentBarGroup.push( settings.prevCorner );
                    settings.barGroups.push( settings.currentBarGroup );
                    settings.currentBarGroup = [ [x0,p[1]] ];
                }
            }
            settings.prevCorner = [x1,p[1]];
        }
    });
    
    BarRenderer.respondsTo("end", function () {
        var settings     = this.settings(),
            context      = settings.context,
            barpixelbase = settings.barpixelbase,
            max = Math.max,
            min = Math.min,
            p,
            barGroup,
            i, j, n;

        if (settings.prevCorner !== null && settings.currentBarGroup !== null) {
            settings.currentBarGroup.push( settings.prevCorner );
            settings.barGroups.push( settings.currentBarGroup );
        }        

        context.save();
        context.strokeStyle = settings.linecolor.getHexString("#");
        context.beginPath();
        for (i = 0; i < settings.barGroups.length; i++) {
            barGroup = settings.barGroups[i];
            n = barGroup.length;
            if (n < 2) { return; } // this should never happen
            
            // For the first point, draw 3 lines:
            //
            //       y |------
            //         |
            //         |
            //    base |------
            //         ^     ^
            //         x     x(next)
            //
            
            //   horizontal line @ y from x(next) to x
            context.moveTo(barGroup[1][0], barGroup[0][1]);
            context.lineTo(barGroup[0][0], barGroup[0][1]);
            //   vertical line @ x from y to base
            context.lineTo(barGroup[0][0], barpixelbase);
            //   horizontal line @ base from x to x(next)
            context.lineTo(barGroup[1][0], barpixelbase);
            
            for (j = 1; j < n - 1; ++j) {
                // For intermediate points, draw 3 lines:
                //
                //       y |
                //         |
                //         |
                //         |------ y(next)
                //         |
                //         |
                //         |------ base
                //         ^     ^
                //         x     x(next)
                //
                //   vertical line @ x from min to max of (y, y(next), base)
                context.moveTo(barGroup[j][0], min(barGroup[j-1][1], barGroup[j][1], barpixelbase));
                context.lineTo(barGroup[j][0], max(barGroup[j-1][1], barGroup[j][1], barpixelbase));
                //   horizontal line @ y(next) from x to x(next)
                context.moveTo(barGroup[j][0],   barGroup[j][1]);
                context.lineTo(barGroup[j+1][0], barGroup[j][1]);
                //   horizontal line @ base from x to x(next)
                context.moveTo(barGroup[j][0],   barpixelbase);
                context.lineTo(barGroup[j+1][0], barpixelbase);
            }
            // For last point, draw one line:
            //
            //       y |
            //         |
            //         |
            //    base |
            //         ^     ^
            //         x     x(next)
            //
            //   vertical line @ x from base to y
            context.moveTo(barGroup[n-1][0], barGroup[n-1][1]);
            context.lineTo(barGroup[n-1][0], barpixelbase);
        }
        context.stroke();
        context.restore();
    });

    BarRenderer.respondsTo("renderLegendIcon", function (context, x, y, icon) {
        var settings          = this.settings(),
            rendererFillColor = this.getOptionValue("fillcolor", 0).toRGBA(this.getOptionValue("fillopacity", 0));

        context.save();
        context.transform(1, 0, 0, 1, x, y);

        // Draw icon background (with opacity)
        context.fillStyle = "rgba(255, 255, 255, 1)";
        context.fillRect(0, 0, icon.width(), icon.height());

        context.lineWidth = 1;
        context.fillStyle = rendererFillColor;

        if (settings.barpixelwidth < settings.hidelines) {
            context.strokeStyle = rendererFillColor;
        } else {
            context.strokeStyle = this.getOptionValue("linecolor", 0).toRGBA();
        }

        // Adjust the width of the icons bars based upon the width and height of the icon Ranges: {20, 10, 0}
        var iconWidth = icon.width(),
            iconHeight = icon.height(),
            barwidth;
        if (iconWidth > 20 || iconHeight > 20) {
            barwidth = iconWidth / 6;
        } else if (iconWidth > 10 || iconHeight > 10) {
            barwidth = iconWidth / 4;
        } else {
            barwidth = iconWidth / 4;
        }

        // If the icon is large enough draw extra bars
        if (iconWidth > 20 && iconHeight > 20) {
            context.fillRect(   (iconWidth / 4) - (barwidth / 2),             0, barwidth, iconHeight / 2);
            context.strokeRect( (iconWidth / 4) - (barwidth / 2),             0, barwidth, iconHeight / 2);

            context.fillRect(   iconWidth - (iconWidth / 4) - (barwidth / 2), 0, barwidth, iconHeight / 3);
            context.strokeRect( iconWidth - (iconWidth / 4) - (barwidth / 2), 0, barwidth, iconHeight / 3);
        }

        context.fillRect(       (iconWidth / 2) - (barwidth / 2),             0, barwidth, iconHeight - (iconHeight / 4));
        context.strokeRect(     (iconWidth / 2) - (barwidth / 2),             0, barwidth, iconHeight - (iconHeight / 4));

        context.restore();
    });
    
    return BarRenderer;
};


},{"../../../core/renderers/bar_renderer.js":59}],92:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function() {
    var FillRenderer = require('../../../core/renderers/fill_renderer.js');

    if (_INCLUDED) { return FillRenderer; }
    _INCLUDED = true;

    // cached state object, for quick access during rendering, populated in begin() method:
    FillRenderer.hasA("state");

    FillRenderer.respondsTo("begin", function (context) {
        var state = {
            "context"            : context,
            "run"                : [],
            "previouspoint"      : null,
            "linecolor"          : this.getOptionValue("linecolor"),
            "linewidth"          : this.getOptionValue("linewidth"),
            "fillcolor"          : this.getOptionValue("fillcolor"),
            "downfillcolor"      : this.getOptionValue("downfillcolor"),
            "fillopacity"        : this.getOptionValue("fillopacity"),
            "fillbase"           : this.getOptionValue("fillbase"),
            "currentfillcolor"   : null
        };
        if (state.downfillcolor === null) {
            state.downfillcolor = state.fillcolor;
        }
        if (state.fillbase !== null) {
            state.fillpixelbase = this.plot().verticalaxis().dataValueToAxisValue(state.fillbase);
        } else {
            state.fillpixelbase = 0;
        }

        this.state(state);

        context.save();
        context.fillStyle = state.fillcolor.getHexString("#");
    });

    // This renderer's dataPoint() method works by accumulating
    // and drawing one "run" of data points at a time.  A "run" of
    // points consists of a consecutive sequence of non-missing
    // data points which have the same fill color.  (The fill
    // color can change if the data line crosses the fill base
    // line, if the downfillcolor is different from the
    // fillcolor.)
    FillRenderer.respondsTo("dataPoint", function (datap) {
        var state = this.state(),
            fillpixelbase = state.fillpixelbase,
            fillcolor,
            linecolor,
            p;

        // if this is a missing point, and if it's not the first point, end the current run and render it
        if (this.isMissing(datap)) {
            if (state.previouspoint !== null) {
                state.run.push( [state.previouspoint[0], fillpixelbase] );
                this.renderRun();
                state.run = [];
                state.previouspoint = null;
            }
            return;
        }

        // transform point to pixel coords
        p = this.transformPoint(datap);

        // set the fillcolor and linecolor for this data point, based on whether it's above
        // or below the base line
        if (p[1] >= fillpixelbase) {
            fillcolor = state.fillcolor;
        } else {
            fillcolor = state.downfillcolor;
        }

        // if we're starting a new run, start with this data point's base line projection
        if (state.run.length === 0) {
            state.run.push( [p[0], fillpixelbase] );
        } else {
            // if we're not starting a new run, but the fill color
            // has changed, interpolate to find the exact base
            // line crossing point, end the current run with that
            // point, render it, and start a new run with the
            // crossing point.
            if (!fillcolor.eq(state.currentfillcolor)) {
                var x = mathUtil.safe_interp(fillpixelbase, state.previouspoint[1], p[1], state.previouspoint[0], p[0]);
                // base line crossing point is [x, state.fillpixelbase]
                // These points are pushed twice so the outline of the fill will be drawn properly,
                // otherwise the outline would not be drawn around the segments that cross the baseline.
                state.run.push( [x, fillpixelbase] );
                state.run.push( [x, fillpixelbase] );
                this.renderRun();
                state.run = [];
                state.run.push( [x, fillpixelbase] );
                state.run.push( [x, fillpixelbase] );
            }
        }

        // add this point to the current run, and remember it and the current colors for next time
        state.run.push(p);
        state.previouspoint = p;
        state.currentfillcolor = fillcolor;
    });

    FillRenderer.respondsTo("end", function () {
        var state = this.state(),
            context = state.context;
        if (state.run.length > 0) {
            state.run.push( [state.run[state.run.length-1][0], state.fillpixelbase] );
            this.renderRun();
        }
        context.restore();
    });

    // Render the current run of data points.  This consists of drawing the fill region
    // under the points, and the lines connecting the points.  The first and last points
    // in the run array are always on the base line; the points in between these two
    // are the actual data points.
    FillRenderer.respondsTo("renderRun", function () {
        var state = this.state(),
            context = state.context,
            i;

        // fill the run
        context.save();
        context.globalAlpha = state.fillopacity;
        context.fillStyle = state.currentfillcolor.getHexString("#");
        context.beginPath();
        context.moveTo(state.run[0][0], state.run[0][1]);
        for (i = 1; i < state.run.length; ++i) {
            context.lineTo(state.run[i][0], state.run[i][1]);
        }
        context.fill();
        context.restore();

        // stroke the run
        context.save();
        context.strokeStyle = state.linecolor.getHexString("#");
        context.lineWidth = state.linewidth;
        context.beginPath();
        context.moveTo(state.run[1][0], state.run[1][1]);
        for (i = 2; i < state.run.length-1; ++i) {
            context.lineTo(state.run[i][0], state.run[i][1]);
        }
        context.stroke();
        context.restore();
    });

    FillRenderer.respondsTo("renderLegendIcon", function (context, x, y, icon) {
        var state = this.state(),
            iconWidth = icon.width(),
            iconHeight = icon.height();
        
        context.save();
        context.transform(1, 0, 0, 1, x, y);

        context.save();
        // Draw icon background (with opacity)
        if (iconWidth < 10 || iconHeight < 10) {
            context.fillStyle = state.fillcolor.toRGBA();
        } else {
            context.fillStyle = "rgba(255, 255, 255, 1)";
        }
        context.fillRect(0, 0, iconWidth, iconHeight);
        context.restore();

        context.strokeStyle = state.linecolor.toRGBA();
        context.lineWidth   = state.linewidth;
        context.fillStyle   = state.fillcolor.toRGBA(state.fillopacity);

        context.beginPath();
        context.moveTo(0, 0);
        // Draw the middle range icon or the large range icon if the width and height allow it
        if (iconWidth > 10 || iconHeight > 10) {
            // Draw a more complex icon if the icons width and height are large enough
            if (iconWidth > 20 || iconHeight > 20) {
                context.lineTo(iconWidth / 6, iconHeight / 2);
                context.lineTo(iconWidth / 3, iconHeight / 4);
            }
            context.lineTo(iconWidth / 2, iconHeight - iconHeight / 4);

            if (iconWidth > 20 || iconHeight > 20) {
                context.lineTo(iconWidth - iconWidth / 3, iconHeight / 4);
                context.lineTo(iconWidth - iconWidth / 6, iconHeight / 2);
            }
        }
        context.lineTo(iconWidth, 0);
        context.stroke();
        context.fill();

        context.restore();
    });

    return FillRenderer;
};

},{"../../../core/renderers/fill_renderer.js":60}],93:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function() {
    var PointlineRenderer = require('../../../core/renderers/pointline_renderer.js'),
        Renderer = require('../../../core/renderer.js');

    if (_INCLUDED) { return PointlineRenderer; }
    _INCLUDED = true;

    // cached settings object, for quick access during rendering, populated in begin() method:
    PointlineRenderer.hasA("settings");

    PointlineRenderer.respondsTo("begin", function (context) {
        var settings = {
            "context"            : context,
            "points"             : [],
            "first"              : true,
            "pointshape"         : this.getOptionValue("pointshape"),
            "pointcolor"         : this.getOptionValue("pointcolor"),
            "pointopacity"       : this.getOptionValue("pointopacity"),
            "pointsize"          : this.getOptionValue("pointsize"),
            "pointoutlinewidth"  : this.getOptionValue("pointoutlinewidth"),
            "pointoutlinecolor"  : this.getOptionValue("pointoutlinecolor"),
            "linecolor"          : this.getOptionValue("linecolor"),
            "linewidth"          : this.getOptionValue("linewidth")
        };

        // turns off points for line renderers
        if (this.type() === Renderer.LINE) {
            settings.pointsize = 0;
        }
        // turns off lines for point renderers
        if (this.type() === Renderer.POINT) {
            settings.linewidth = 0;
        }
        this.settings(settings);

        if (settings.linewidth > 0) {
            context.save();
            context.beginPath();
            context.lineWidth = settings.linewidth;
            context.strokeStyle = settings.linecolor.getHexString("#");
        }
    });
    PointlineRenderer.respondsTo("dataPoint", function (datap) {
        var settings = this.settings(),
            context  = settings.context,
            p;
        if (this.isMissing(datap)) {
            settings.first = true;
            return;
        }
        p = this.transformPoint(datap);
        if (settings.linewidth > 0) {
            if (settings.first) {
                context.moveTo(p[0], p[1]);
                settings.first = false;
            } else {
                context.lineTo(p[0], p[1]);
            }
        }
        if (settings.pointsize > 0) {
            settings.points.push(p);
        }
    });

    PointlineRenderer.respondsTo("end", function () {
        var settings = this.settings(),
            context  = settings.context;
        if (settings.linewidth > 0) {
            context.stroke();
            context.restore();
        }
        if (settings.pointsize > 0) {
            this.drawPoints();
        }
    });


    PointlineRenderer.respondsTo("drawPoints", function (p) {
        var settings   = this.settings(),
            context    = settings.context,
            points     = settings.points,
            pointshape = settings.pointshape,
            i;

        context.save();
        context.beginPath();
        if ((pointshape === PointlineRenderer.PLUS) || (pointshape === PointlineRenderer.X)) {
            context.strokeStyle = settings.pointcolor.getHexString("#");
            context.lineWidth = settings.pointoutlinewidth;
        } else {
            context.fillStyle = settings.pointcolor.toRGBA(settings.pointopacity);
            context.strokeStyle = settings.pointoutlinecolor.getHexString("#");
            context.lineWidth = settings.pointoutlinewidth;
        }

        for (i=0; i<points.length; ++i) {
            this.drawPoint(context, settings, points[i]);
        }

        if (!((pointshape === PointlineRenderer.PLUS) || (pointshape === PointlineRenderer.X))) {
            context.fill();
        }
        context.stroke();
        context.restore();
    });

    PointlineRenderer.respondsTo("drawPoint", function (context, settings, p) {
        var pointsize = settings.pointsize,
            p0 = p[0],
            p1 = p[1],
            a,b,d;

        switch (settings.pointshape) {
        case PointlineRenderer.PLUS:
            context.moveTo(p0,             p1 - pointsize);
            context.lineTo(p0,             p1 + pointsize);
            context.moveTo(p0 - pointsize, p1);
            context.lineTo(p0 + pointsize, p1);
            return;
        case PointlineRenderer.X:
            d = 0.70710 * pointsize;
            context.moveTo(p0-d, p1-d);
            context.lineTo(p0+d, p1+d);
            context.moveTo(p0-d, p1+d);
            context.lineTo(p0+d, p1-d);
            return;
        case PointlineRenderer.SQUARE:
            context.moveTo(p0 - pointsize, p1 - pointsize);
            context.lineTo(p0 + pointsize, p1 - pointsize);
            context.lineTo(p0 + pointsize, p1 + pointsize);
            context.lineTo(p0 - pointsize, p1 + pointsize);
            return;
        case PointlineRenderer.TRIANGLE:
            d = 1.5 * pointsize;
            a = 0.866025 * d;
            b = 0.5 * d;
            context.moveTo(p0,     p1 + d);
            context.lineTo(p0 + a, p1 - b);
            context.lineTo(p0 - a, p1 - b);
            return;
        case PointlineRenderer.DIAMOND:
            d = 1.5 * pointsize;
            context.moveTo(p0 - pointsize, p1);
            context.lineTo(p0,             p1 + d);
            context.lineTo(p0 + pointsize, p1);
            context.lineTo(p0,             p1 - d);
            return;
        case PointlineRenderer.STAR:
            d = 1.5 * pointsize;
            context.moveTo(p0 - d*0.0000, p1 + d*1.0000);
            context.lineTo(p0 + d*0.3536, p1 + d*0.3536);
            context.lineTo(p0 + d*0.9511, p1 + d*0.3090);
            context.lineTo(p0 + d*0.4455, p1 - d*0.2270);
            context.lineTo(p0 + d*0.5878, p1 - d*0.8090);
            context.lineTo(p0 - d*0.0782, p1 - d*0.4938);
            context.lineTo(p0 - d*0.5878, p1 - d*0.8090);
            context.lineTo(p0 - d*0.4938, p1 - d*0.0782);
            context.lineTo(p0 - d*0.9511, p1 + d*0.3090);
            context.lineTo(p0 - d*0.2270, p1 + d*0.4455);
            return;
        case PointlineRenderer.CIRCLE:
            context.moveTo(p0 + pointsize, p1);
            context.arc(p0, p1, pointsize, 0, 2*Math.PI, false);
            return;
        }
    });

    PointlineRenderer.respondsTo("renderLegendIcon", function (context, x, y, icon) {
        var settings   = this.settings(),
            pointshape = settings.pointshape,
            iconWidth  = icon.width(),
            iconHeight = icon.height();

        context.save();
        // Draw icon background (with opacity)
        context.fillStyle = "rgba(255, 255, 255, 1)";
        context.fillRect(x, y, iconWidth, iconHeight);

        if (settings.linewidth > 0) {
            context.strokeStyle = settings.linecolor.toRGBA();
            context.lineWidth   = settings.linewidth;
            context.beginPath();
            context.moveTo(x, y + iconHeight/2);
            context.lineTo(x + iconWidth, y + iconHeight/2);
            context.stroke();
        }
        if (settings.pointsize > 0) {
            context.beginPath();
            if ((pointshape === PointlineRenderer.PLUS) || (pointshape === PointlineRenderer.X)) {
                context.strokeStyle = settings.pointcolor.toRGBA();
                context.lineWidth   = settings.pointoutlinewidth;
            } else {
                context.fillStyle   = settings.pointcolor.toRGBA(settings.pointopacity);
                context.strokeStyle = settings.pointoutlinecolor.toRGBA();
                context.lineWidth   = settings.pointoutlinewidth;
            }

            this.drawPoint(context, settings, [(x + iconWidth/2), (y + iconHeight/2)]);

            if (!((pointshape === PointlineRenderer.PLUS) || (pointshape === PointlineRenderer.X))) {
                context.fill();
            }
            context.stroke();
        }
        context.restore();
    });

    return PointlineRenderer;
};

},{"../../../core/renderer.js":56,"../../../core/renderers/pointline_renderer.js":61}],94:[function(require,module,exports){
var _INCLUDED = false;
module.exports = function() {
    var RangeBarRenderer = require('../../../core/renderers/rangebar_renderer.js');

    if (_INCLUDED) { return RangeBarRenderer; }
    _INCLUDED = true;

    // cached state object, for quick access during rendering, populated in begin() method:
    RangeBarRenderer.hasA("state");

    RangeBarRenderer.respondsTo("begin", function (context) {
        var state = {
            "context"            : context,
            "run"                : [],
            "barpixelwidth"      : this.getOptionValue("barwidth").getRealValue() * this.plot().horizontalaxis().axisToDataRatio(),
            "barpixeloffset"     : 0,
            "baroffset"          : this.getOptionValue("baroffset"),
            "fillcolor"          : this.getOptionValue("fillcolor"),
            "fillopacity"        : this.getOptionValue("fillopacity"),
            "linecolor"          : this.getOptionValue("linecolor"),
            "linewidth"          : this.getOptionValue("linewidth"),
            "hidelines"          : this.getOptionValue("hidelines")
        };
        state.barpixeloffset = state.barpixelwidth * state.baroffset;
        this.state(state);
        context.save();
        context.beginPath();
    });

    RangeBarRenderer.respondsTo("dataPoint", function (datap) {
        if (this.isMissing(datap)) {
            return;
        }

        var state = this.state(),
            context = state.context,
            p = this.transformPoint(datap),
            x0 = p[0] - state.barpixeloffset,
            x1 = x0 + state.barpixelwidth;

        context.moveTo(x0, p[1]);
        context.lineTo(x0, p[2]);
        context.lineTo(x1, p[2]);
        context.lineTo(x1, p[1]);
        context.lineTo(x0, p[1]);
    });

    RangeBarRenderer.respondsTo("end", function () {
        var state = this.state(),
            context = state.context;

        context.globalAlpha = state.fillopacity;
        context.fillStyle = state.fillcolor.getHexString("#");
        context.fill();
        if (state.linewidth > 0 && state.barpixelwidth > state.hidelines) {
            context.strokeStyle = state.linecolor.getHexString("#");
            context.lineWidth = state.linewidth;
            context.stroke();
        }
        context.restore();
    });

    RangeBarRenderer.respondsTo("renderLegendIcon", function (context, x, y, icon) {
        var state = this.state(),
            iconWidth  = icon.width(),
            iconHeight = icon.height(),
            barwidth;

        context.save();
        context.transform(1, 0, 0, 1, x, y);

        // Draw icon background (with opacity)
        context.save();
        context.strokeStyle = "#FFFFFF";
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, iconWidth, iconHeight);
        context.restore();

        // Draw icon graphics
        context.fillStyle = state.fillcolor.toRGBA(state.fillopacity);
        context.lineWidth = state.linewidth;
        if (state.barpixelwidth < 10) {
            context.strokeStyle = state.fillcolor.toRGBA(state.fillopacity);
        } else {
            context.strokeStyle = state.linecolor.getHexString("#");
        }

        // Adjust the width of the icons bars based upon the width and height of the icon Ranges: {20, 10, 0}
        if (iconWidth > 20 || iconHeight > 20) {
            barwidth = iconWidth / 6;
        } else if(iconWidth > 10 || iconHeight > 10) {
            barwidth = iconWidth / 4;
        } else {
            barwidth = iconWidth / 4;
        }

        // If the icon is large enough draw extra bars
        if (iconWidth > 20 && iconHeight > 20) {
            context.fillRect(  iconWidth/4 - barwidth/2,             iconHeight/8, barwidth, iconHeight/2);
            context.strokeRect(iconWidth/4 - barwidth/2,             iconHeight/8, barwidth, iconHeight/2);

            context.fillRect(  iconWidth - iconWidth/4 - barwidth/2, iconHeight/4, barwidth, iconHeight/3);
            context.strokeRect(iconWidth - iconWidth/4 - barwidth/2, iconHeight/4, barwidth, iconHeight/3);
        }

        context.fillRect(  iconWidth/2 - barwidth/2, 0, barwidth, iconHeight-iconHeight/4);
        context.strokeRect(iconWidth/2 - barwidth/2, 0, barwidth, iconHeight-iconHeight/4);

        context.restore();
    });

    return RangeBarRenderer;
};

},{"../../../core/renderers/rangebar_renderer.js":62}],95:[function(require,module,exports){
module.exports = function() {
    var Text = require('../../core/text.js');

    if (typeof(Text.drawText)==="function") { return Text; }

    Text.respondsTo("initializeGeometry", function (graphicsContext) {
        var origWidth,
            origHeight,
            rotatedWidth,
            rotatedHeight;

        graphicsContext.context.save();
        if (graphicsContext.fontSize !== undefined) {
            graphicsContext.context.font = graphicsContext.fontSize + " sans-serif";
        }

        origWidth  = this.measureStringWidth(graphicsContext.context);
        origHeight = this.measureStringHeight(graphicsContext.context);

        graphicsContext.context.restore();

        if (graphicsContext.angle !== undefined) {
            var angle = graphicsContext.angle/180 * Math.PI;
            rotatedWidth = Math.abs(Math.cos(angle)) * origWidth + Math.abs(Math.sin(angle)) * origHeight;
            rotatedHeight = Math.abs(Math.sin(angle)) * origWidth + Math.abs(Math.cos(angle)) * origHeight;
        } else {
            rotatedWidth = origWidth;
            rotatedHeight = origHeight;
        }

        this.origWidth(origWidth);
        this.origHeight(origHeight);
        this.rotatedWidth(rotatedWidth);
        this.rotatedHeight(rotatedHeight);

        return this;
    });

    /**
     * Determines unrotated width for the stored string in the canvas environment.
     *
     * @method measureStringWidth
     * @for Text
     * @private
     * @return {Float} Unrotated width of string.
     * @param {Context} context
     */
    Text.respondsTo("measureStringWidth", function (context) {
        if (this.string() === undefined) {
            throw new Error("measureStringWidth requires the string attr to be set.");
        }

        var metrics = context.measureText(this.string());
        return metrics.width;
    });

    /**
     * Determines unrotated height for the stored string in the canvas environment.
     *
     * @method measureStringHeight
     * @for Text
     * @private
     * @return {Float} Unrotated height of string.
     * @param {Context} context
     */
    Text.respondsTo("measureStringHeight", function (context) {
        if (this.string() === undefined) {
            throw new Error("measureStringHeight requires the string attr to be set.");
        }

        //NOTE: kludge: canvas cannot exactly measure text height, so we just return a value
        //      estimated by using the width of an "M" as a substitute.  Maybe improve this
        //      later by using a better workaround.
        var metrics = context.measureText("M"),
            newlineCount = this.string().match(/\n/g);
        return (newlineCount !== null ? (newlineCount.length + 1) : 1) * metrics.width;
    });

    Text.respondsTo("setTransform", function (context, anchor, base, position, angle) {
        context.transform(1, 0, 0, -1, 0, 2 * base.y());
        context.transform(1, 0, 0, 1, base.x(), base.y());
        context.transform(1, 0, 0, 1, position.x(), -position.y());
        context.rotate(-angle * Math.PI/180.0);
        context.transform(1, 0, 0, 1, -anchor.x(), anchor.y());
    });

    Text.respondsTo("drawText", function (context, anchor, base, position, angle) {
        context.save();
        this.setTransform(context, anchor, base, position, angle);
        context.fillText(this.string(), 0, 0);
        context.restore();
    });

    return Text;
};

},{"../../core/text.js":63}],96:[function(require,module,exports){
module.exports = function() {
    var Window = require('../../core/window.js');

    if (typeof(Window.render)==="function") { return Window; }

    Window.respondsTo("render", function (context, width, height) {
        var m = this.margin().left();

        context.save();
        context.fillStyle = this.bordercolor().getHexString("#");
        context.fillRect(m, m, width - 2*m, height - 2*m);
        context.restore();
    });

    return Window;
};

},{"../../core/window.js":69}],97:[function(require,module,exports){
require('../lib/jquery/jquery.min.js');
require('./main.js');

},{"../lib/jquery/jquery.min.js":13,"./main.js":98}],98:[function(require,module,exports){
require('../lib/ajaxthrottle/src/ajaxthrottle.js');
require('../lib/lightbox/lightbox.js');
require('../lib/jquery/jquery.mousewheel.js');
require('../lib/busy-spinner/busy_spinner.js');
require('../lib/error-display/build/errorDisplay.js');
require('../lib/requestanimationframe/requestanimationframe.js');

require('./parser/jquery_xml_parser.js')($);
require('./graphics/canvas/all.js')($, window);

// This forces ./events/multigraph.js to load, which is where the 'main' program
// really lives --- i.e. installation of the Multigraph jQuery plugin, and the
// $(document).ready(...) stuff that springs into action once the page has loaded.
// Note that the 3rd arg to require('./events/multigraph.js') is unused.
require('./events/multigraph.js')($, window, undefined);

// For JS applications that want to use the bundled multigraph file, instead of
// referencing Multigraph through npm-style require statements, and for backward
// compatibility with pre-npm versions of Multigraph, create the globael
// window.multigraph object which exposes a bunch of objects/functions from the
// Multigraph code.
var Multigraph = require('./core/multigraph.js')($);
window.multigraph = {
    'core' : {
        'Multigraph':                	Multigraph,
        'CSVData':                		require('./core/csv_data.js')($),
        'WebServiceData':             	require('./core/web_service_data.js')($),

        'ArrayData':                    require('./core/array_data.js'),
        'Axis':                         require('./core/axis.js'),
        'AxisBinding':                  require('./core/axis_binding.js'),
        'AxisTitle':                    require('./core/axis_title.js'),
        'Background':                   require('./core/background.js'),
        'ConstantPlot':                 require('./core/constant_plot.js'),
        'Data':                         require('./core/data.js'),
        'DataFormatter':                require('./core/data_formatter.js'),
        'DataMeasure':                  require('./core/data_measure.js'),
        'DataPlot':                     require('./core/data_plot.js'),
        'DataValue':                    require('./core/data_value.js'),
        'DataVariable':                 require('./core/data_variable.js'),
        'Datatips':                     require('./core/datatips.js'),
        'DatatipsVariable':             require('./core/datatips_variable.js'),
        'DatetimeFormatter':            require('./core/datetime_formatter.js'),
        'DatetimeMeasure':              require('./core/datetime_measure.js'),
        'DatetimeValue':                require('./core/datetime_value.js'),
        'EventEmitter':                 require('./core/event_emitter.js'),
        'FilterOption':                 require('./core/filter_option.js'),
        'Filter':                       require('./core/filter.js'),
        'Graph':                        require('./core/graph.js'),
        'Grid':                         require('./core/grid.js'),
        'Icon':                         require('./core/icon.js'),
        'Img':                          require('./core/img.js'),
        'Labeler':                      require('./core/labeler.js'),
        'Legend':                       require('./core/legend.js'),
        'Mixin':                        require('./core/mixin.js'),
        'NumberFormatter':              require('./core/number_formatter.js'),
        'NumberMeasure':                require('./core/number_measure.js'),
        'NumberValue':                  require('./core/number_value.js'),
        'Pan':                          require('./core/pan.js'),
        'PeriodicArrayData':            require('./core/periodic_array_data.js'),
        'Plot':                         require('./core/plot.js'),
        'PlotLegend':                   require('./core/plot_legend.js'),
        'Plotarea':                     require('./core/plotarea.js'),
        'Renderer':                     require('./core/renderer.js'),
        'BandRenderer':                 require('./core/renderers/band_renderer.js'),
        'BarRenderer':                  require('./core/renderers/bar_renderer.js'),
        'FillRenderer':                 require('./core/renderers/fill_renderer.js'),
        'PointlineRenderer':            require('./core/renderers/pointline_renderer.js'),
        'RangeBarRenderer':             require('./core/renderers/rangebar_renderer.js'),
        'Text':                         require('./core/text.js'),
        'Title':                        require('./core/title.js'),
        'Warning':                      require('./core/warning.js'),
        'WebServiceDataCacheNode':      require('./core/web_service_data_cache_node.js'),
        'WebServiceDataIterator':       require('./core/web_service_data_iterator.js'),
        'Window':                       require('./core/window.js'),
        'Zoom':                         require('./core/zoom.js')
    },

    'create': Multigraph.create,

    'math': {
        'Box': 				require('./math/box.js'),
        'Displacement': 	require('./math/displacement.js'),
        'Enum': 			require('./math/enum.js'),
        'Insets': 			require('./math/insets.js'),
        'Point': 			require('./math/point.js'),
        'RGBColor': 		require('./math/rgb_color.js'),
        'util': 			require('./math/util.js')
    },
    'parser' : {
        'stringToJQueryXMLObj' : require('./parser/jquery_xml_parser.js').stringToJQueryXMLObj
    },
    'jQuery' : $
};
window.sprintf = require('sprintf');

},{"../lib/ajaxthrottle/src/ajaxthrottle.js":1,"../lib/busy-spinner/busy_spinner.js":2,"../lib/error-display/build/errorDisplay.js":3,"../lib/jquery/jquery.mousewheel.js":14,"../lib/lightbox/lightbox.js":15,"../lib/requestanimationframe/requestanimationframe.js":16,"./core/array_data.js":18,"./core/axis.js":19,"./core/axis_binding.js":20,"./core/axis_title.js":21,"./core/background.js":22,"./core/constant_plot.js":23,"./core/csv_data.js":24,"./core/data.js":25,"./core/data_formatter.js":26,"./core/data_measure.js":27,"./core/data_plot.js":28,"./core/data_value.js":29,"./core/data_variable.js":30,"./core/datatips.js":31,"./core/datatips_variable.js":32,"./core/datetime_formatter.js":33,"./core/datetime_measure.js":34,"./core/datetime_value.js":36,"./core/event_emitter.js":37,"./core/filter.js":38,"./core/filter_option.js":39,"./core/graph.js":40,"./core/grid.js":41,"./core/icon.js":42,"./core/img.js":43,"./core/labeler.js":44,"./core/legend.js":45,"./core/mixin.js":46,"./core/multigraph.js":47,"./core/number_formatter.js":48,"./core/number_measure.js":49,"./core/number_value.js":50,"./core/pan.js":51,"./core/periodic_array_data.js":52,"./core/plot.js":53,"./core/plot_legend.js":54,"./core/plotarea.js":55,"./core/renderer.js":56,"./core/renderers/band_renderer.js":58,"./core/renderers/bar_renderer.js":59,"./core/renderers/fill_renderer.js":60,"./core/renderers/pointline_renderer.js":61,"./core/renderers/rangebar_renderer.js":62,"./core/text.js":63,"./core/title.js":64,"./core/warning.js":65,"./core/web_service_data.js":66,"./core/web_service_data_cache_node.js":67,"./core/web_service_data_iterator.js":68,"./core/window.js":69,"./core/zoom.js":70,"./events/multigraph.js":75,"./graphics/canvas/all.js":78,"./math/box.js":99,"./math/displacement.js":100,"./math/enum.js":101,"./math/insets.js":102,"./math/point.js":103,"./math/rgb_color.js":104,"./math/util.js":105,"./parser/jquery_xml_parser.js":119,"sprintf":17}],99:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Box = new jermaine.Model("Box", function () {
    this.hasA("width").which.isA("number");
    this.hasA("height").which.isA("number");
    this.isBuiltWith("width", "height");
});
    
module.exports = Box;

},{"../../lib/jermaine/src/jermaine.js":9}],100:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js'),
    validationFunctions = require('../util/validationFunctions.js');

var Displacement = {};
/**
 * A Displacement represents a geometric position along a line
 * segment, expressed in terms of two quantities: a relative
 * position called `a`, and an absolute offset called `b`.  The
 * length of the line segment is not known in advance --- the idea
 * is that the Displacement object encapsulates a rule for
 * determining a location along ANY line segment.  The Displacement
 * has methods which take the line segment length as an argument
 * and return the computed final position.
 *
 * There are two different position-calcuating methods,
 * corresponding to two different interpretations of the relative
 * value `a`:
 *
 * **relative length**:
 *     `a` is a number between 0 and 1, representing a fraction of
 *       the total length of the line segment; the relative
 *       position determined by `a` is the fraction `a` of the
 *       total length of the segment.
 *     In this case, the position-calculating method
 *       `calculateLength(L)` returns the number `a * L + b`, which
 *       corresponds to moving `a` of the way along the length L,
 *       then adding `b`:
 *
 *             [--------------------------------X------------]
 *             |<---- a * L --->|<---- b ------>|
 *             |<------------------  L  -------------------->|
 *
 * **relative coordinate**:
 *     `a` is a number between -1 and 1, representing a coordinate
 *       value in a [-1,1] coordinate system along the line
 *       segment.
 *     In this case, the position-calculating method
 *       `calculateCoordinate(L)` returns the number `(a+1) * L/2 +
 *       b`.  which corresponds to moving to the position
 *       determined by the `a` coordinate, then adding `b`:
 *
 *             [------------------------------------X--------]
 *             |<--- (a+1) * L/2 --->|<---- b ----->|
 *             |<------------------  L  -------------------->|
 *
 * @class Displacement
 * @for Displacement
 * @constructor
 * @param {Number} a
 * @param {Integer} b (OPTIONAL)
 */
Displacement = new jermaine.Model("Displacement", function () {
    
    this.hasA("a").which.validatesWith(function (a) {
        return validationFunctions.validateNumberRange(a, -1.0, 1.0);
    });
    this.hasA("b").which.isA("integer").and.defaultsTo(0);
    this.isBuiltWith("a", "%b");

    this.respondsTo("calculateLength", function (totalLength) {
        return this.a() * totalLength + this.b();
    });

    this.respondsTo("calculateCoordinate", function (totalLength) {
        return (this.a() + 1) * totalLength/2.0 + this.b();
    });

});

Displacement.regExp = /^([\+\-]?[0-9\.]+)([+\-])([0-9\.+\-]+)$/;

/**
 * Parses a string into a Displacement.  The string should be of one of the following forms:
 *
 *     "A+B"  ==>  a=A  b=B
 *     "A-B"  ==>  a=A  b=-B
 *     "A"    ==>  a=A  b=0
 *     "+A"   ==>  a=A  b=0
 *     "-A"   ==>  a=-A b=0
 * 
 * @method parse
 * @param {String} string
 * @static
 * @author jrfrimme
 */
Displacement.parse = function (string) {
    var ar = Displacement.regExp.exec(string),
        d,
        a,
        b,
        sign;
    if (string === undefined) {
        d = new Displacement(1);
    } else if (ar !== null) {
        a = parseFloat(ar[1]);
        b = parseFloat(ar[3]);
        switch (ar[2]) {
        case "+":
            sign = 1;
            break;
        case "-":
            sign = -1;
            break;
        default:
            sign = 0;
            break;
        }
        /*
         if (isNaN(a) || sign == 0 || isNaN(b)) {
         throw new ParseError('parse error');
         }
         */
        d = new Displacement(a, sign * b);
    } else {
        a = parseFloat(string);
        /*n
         if (isNaN(a)) {
         throw new ParseError('parse error');
         }
         */
        d = new Displacement(a);
    }
    return d;
};

module.exports = Displacement;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/validationFunctions.js":133}],101:[function(require,module,exports){
// Use Enum to create objects that act like enumerations in other languages (such as Java).
// 
// Usage is like this:
// 
//   var Suit = Enum("Suit");
//   var clubs = new Suit("clubs");
//   var diamonds = new Suit("diamonds");
//   var spades = new Suit("spades");
//   var hearts = new Suit("hearts");
// 
//   var c = Suit.parse("clubs");  # c is guaranteed to equal the clubs variable from above
// 
var Enum = function (name) {

    var instances = {};

    var Enum = function (key) {
        if (instances[key] !== undefined) {
            throw new Error("attempt to redefine "+name+" Enum with key '"+key+"'");
        }
        this.enumType = name;
        this.key = key;
        instances[key] = this;
    };

    Enum.parse = function (key) {
        return instances[key];
    };

    Enum.prototype.toString = function () {
        return this.key;
    };

    Enum.isInstance = function (obj) {
        return (obj !== undefined && obj !== null && obj.enumType === name);
    };

    return Enum;
};

module.exports = Enum;

},{}],102:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Insets = new jermaine.Model("Insets", function () {
    this.hasA("top").which.isA("number");
    this.hasA("left").which.isA("number");
    this.hasA("bottom").which.isA("number");
    this.hasA("right").which.isA("number");
    this.respondsTo("set", function (top, left, bottom, right) {
        this.top(top);
        this.left(left);
        this.bottom(bottom);
        this.right(right);
    });
    this.isBuiltWith("top", "left", "bottom", "right");
});

module.exports = Insets;

},{"../../lib/jermaine/src/jermaine.js":9}],103:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var Point = new jermaine.Model("Point", function () {
    this.hasA("x").which.isA("number");
    this.hasA("y").which.isA("number");
    this.isBuiltWith("x", "y");
    this.respondsTo("eq", function (p) {
        return ((this.x()===p.x()) && (this.y()===p.y()));
    });
});

var regExp = /^\s*([0-9\-\+\.eE]+)(,|\s+|\s*,\s+|\s+,\s*)([0-9\-\+\.eE]+)\s*$/;

Point.parse = function (string) {
    var ar = regExp.exec(string),
        p;
    // ar[1] is x value
    // ar[2] is separator between x and y
    // ar[3] is y value
    
    if (!ar || (ar.length !== 4)) {
        throw new Error("cannot parse string '"+string+"' as a Point");
    }
    return new Point(parseFloat(ar[1]), parseFloat(ar[3]));
};

module.exports = Point;


},{"../../lib/jermaine/src/jermaine.js":9}],104:[function(require,module,exports){
var jermaine = require('../../lib/jermaine/src/jermaine.js');

var validationFunctions = require('../util/validationFunctions.js');

var RGBColor = new jermaine.Model("RGBColor", function () {
    
    this.hasA("r").which.validatesWith(function (r) {
        return validationFunctions.validateNumberRange(r, 0, 1.0);
    });
    this.hasA("g").which.validatesWith(function (g) {
        return validationFunctions.validateNumberRange(g, 0, 1.0);
    });
    this.hasA("b").which.validatesWith(function (b) {
        return validationFunctions.validateNumberRange(b, 0, 1.0);
    });
    
    var numberToHex = function (number) {
        number = parseInt(number * 255, 10).toString(16);
        if (number.length === 1) {
            number = "0" + number;
        }
        return number;
    };
    
    this.respondsTo("getHexString", function (prefix) {
        if (!prefix) {
            prefix = "0x";
        }
        return prefix + numberToHex(this.r()) + numberToHex(this.g()) + numberToHex(this.b());
    });
    
    this.respondsTo("toRGBA", function (alpha) {
        if (alpha === undefined) {
            alpha = 1.0;
        }
        if (typeof(alpha) !== "number") {
            throw new Error("RGBColor.toRGBA: The argument, if present, must be a number");
        }
        return "rgba(" + (255*this.r()) + ", " + (255*this.g()) + ", " + (255*this.b()) + ", " + alpha + ")";
    });
    
    this.respondsTo("eq", function (color) {
        return ((this.r()===color.r()) && (this.g()===color.g()) && (this.b()===color.b()));
    });
    
    this.isBuiltWith("r", "g", "b");
    
});


/*
 * To remove support for deprecated color names, remove the following function,
 * and find all references to it elsewhere in the source code, and remove them,
 * along with accompanying code that generates warning message.  Also remove
 * support for these 9 color names from RGBColor.parse below.
 */
RGBColor.colorNameIsDeprecated = function (colorName) {
    switch (colorName) {
    case "grey": return "0xeeeeee";
    case "skyblue": return "0x87ceeb";
    case "khaki": return "0xf0e68c";
    case "orange": return "0xffa500";
    case "salmon": return "0xfa8072";
    case "olive": return "0x9acd32";
    case "sienna": return "0xa0522d";
    case "pink": return "0xffb5c5";
    case "violet": return "0xee82ee";
    }
    return false;
};

RGBColor.parse = function (input) {
    var red,
        green,
        blue,
        grey,
        parsedInput,
        colorObj;
    
    if (input === undefined) {
        return undefined;
    } else if (typeof(input) === "string") {
        parsedInput = input.toLowerCase();
        
        switch (parsedInput) {
        case "black":
            red = 0;
            green = 0;
            blue = 0;
            break;
        case "red":
            red = 1;
            green = 0;
            blue = 0;
            break;
        case "green":
            red = 0;
            green = 1;
            blue = 0;
            break;
        case "blue":
            red = 0;
            green = 0;
            blue = 1;
            break;
        case "yellow":
            red = 1;
            green = 1;
            blue = 0;
            break;
        case "magenta":
            red = 1;
            green = 0;
            blue = 1;
            break;
        case "cyan":
            red = 0;
            green = 1;
            blue = 1;
            break;
        case "white":
            red = 1;
            green = 1;
            blue = 1;
            break;
        case "grey":
            grey = parseInt("ee", 16) / 255;
            red = grey;
            green = grey;
            blue = grey;
            break;
        case "skyblue":
            red = parseInt("87", 16) / 255;
            green = parseInt("ce", 16) / 255;
            blue = parseInt("eb", 16) / 255;
            break;
        case "khaki":
            red = parseInt("f0", 16) / 255;
            green = parseInt("e6", 16) / 255;
            blue = parseInt("8c", 16) / 255;
            break;
        case "orange":
            red = parseInt("ff", 16) / 255;
            green = parseInt("a5", 16) / 255;
            blue = parseInt("00", 16) / 255;
            break;
        case "salmon":
            red = parseInt("fa", 16) / 255;
            green = parseInt("80", 16) / 255;
            blue = parseInt("72", 16) / 255;
            break;
        case "olive":
            red = parseInt("9a", 16) / 255;
            green = parseInt("cd", 16) / 255;
            blue = parseInt("32", 16) / 255;
            break;
        case "sienna":
            red = parseInt("a0", 16) / 255;
            green = parseInt("52", 16) / 255;
            blue = parseInt("2d", 16) / 255;
            break;
        case "pink":
            red = parseInt("ff", 16) / 255;
            green = parseInt("b5", 16) / 255;
            blue = parseInt("c5", 16) / 255;
            break;
        case "violet":
            red = parseInt("ee", 16) / 255;
            green = parseInt("82", 16) / 255;
            blue = parseInt("ee", 16) / 255;
            break;
        default:
            parsedInput = parsedInput.replace(/(0(x|X)|#)/, "");
            if (parsedInput.search(new RegExp(/([^0-9a-f])/)) !== -1) {
                throw new Error("'" + input + "' is not a valid color");
            }
            
            if (parsedInput.length === 6) {
                red = parseInt(parsedInput.substring(0,2), 16) / 255;
                green = parseInt(parsedInput.substring(2,4), 16) / 255;
                blue = parseInt(parsedInput.substring(4,6), 16) / 255;
            } else if (parsedInput.length === 3) {
                red = parseInt(parsedInput.charAt(0), 16) / 15;
                green = parseInt(parsedInput.charAt(1), 16) / 15;
                blue = parseInt(parsedInput.charAt(2), 16) / 15;
            } else {
                throw new Error("'" + input + "' is not a valid color");
            }
            break;
        }
        colorObj = new RGBColor(red, green, blue);
        return colorObj;
    }
    throw new Error("'" + input + "' is not a valid color");
};

module.exports = RGBColor;

},{"../../lib/jermaine/src/jermaine.js":9,"../util/validationFunctions.js":133}],105:[function(require,module,exports){
Util = {};

Util.interp = function (x, x0, x1, y0, y1) {
    // return the 'y' coordinate of the point on the line segment
    // connecting the two points (x0,y0) and (x1,y1) whose 'x'
    // coordinate is x
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
};

Util.safe_interp = function (x, x0, x1, y0, y1) {
    // same as "interp", but if the line is vertical (x0 === x1), return
    // the average of the two y values, rather than NaN
    if (x0 === x1) { return (y0 + y1) / 2; }
    return Util.interp(x, x0, x1, y0, y1);
};

Util.l2dist = function (x1, y1, x2, y2) {
    var dx = x1 - x2;
    var dy = y1 - y2;
    return Math.sqrt(dx*dx + dy*dy);
};

module.exports = Util;

},{}],106:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Axis = require('../core/axis.js'),
        pF = require('../util/parsingFunctions.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Axis.parseXML)==="function") { return Axis; };

    var parseLabels = function (xml, axis) {
        var spacingStrings = [],
            spacingString,
            labelsTag = xml.find("labels"),
            labelTags = xml.find("label"),
            labelers  = axis.labelers(),
            Labeler = require('../core/labeler.js'),
            DataValue = require('../core/data_value.js'),
            utilityFunctions = require('../util/utilityFunctions.js'),
            i;
        spacingString = $.trim(pF.getXMLAttr(labelsTag,"spacing"));
        if (spacingString !== "") {
            spacingStrings = spacingString.split(/\s+/);
        }
        if (spacingStrings.length > 0) {
            // If there was a spacing attr on the <labels> tag, create a new labeler for
            // each spacing present in it, using the other values from the <labels> tag
            for (i = 0; i < spacingStrings.length; ++i) {
                labelers.add(Labeler.parseXML(labelsTag, axis, undefined, spacingStrings[i]));
            }
        } else if (labelTags.length > 0) {
            // If there are <label> tags, parse the <labels> tag to get default values
            var defaults = Labeler.parseXML(labelsTag, axis, undefined, null);
            // And loop over each <label> tag, creating labelers for each, splitting multiple
            // spacings on the same <label> tag into multiple labelers:
            $.each(labelTags, function (j, e) {
                spacingString = $.trim(pF.getXMLAttr($(e), "spacing"));
                spacingStrings = [];
                if (spacingString !== "") {
                    spacingStrings = spacingString.split(/\s+/);
                }
                for (i = 0; i < spacingStrings.length; ++i) {
                    labelers.add( Labeler.parseXML($(e), axis, defaults, spacingStrings[i]) );
                }
            });
        } else {
            // Otherwise create labelers using the default spacing, with the other values
            // from the <labels> tag
            var defaultValues = (utilityFunctions.getDefaultValuesFromXSD()).horizontalaxis.labels;
            spacingString = axis.type() === DataValue.NUMBER ?
                defaultValues.defaultNumberSpacing :
                defaultValues.defaultDatetimeSpacing;
            spacingStrings = spacingString.split(/\s+/);
            for (i = 0; i < spacingStrings.length; ++i) {
                labelers.add(Labeler.parseXML(labelsTag, axis, undefined, spacingStrings[i]));
            }
        }
    };

    
    Axis.parseXML = function (xml, orientation, messageHandler, multigraph) {

        var DataValue = require('../core/data_value.js'),
            Point = require('../math/point.js'),
            RGBColor = require('../math/rgb_color.js'),
            Displacement = require('../math/displacement.js'),
            AxisTitle = require('../core/axis_title.js'),
            Grid = require('../core/grid.js'),
            Pan = require('../core/pan.js'),
            Zoom = require('../core/zoom.js'),
            AxisBinding = require('../core/axis_binding.js'),

            axis              = new Axis(orientation),
            parseAttribute    = pF.parseAttribute,
            parseInteger      = pF.parseInteger,
            parseString       = pF.parseString,
            parseDisplacement = Displacement.parse,
            parsePoint        = Point.parse,
            parseRGBColor     = RGBColor.parse,
            attr, child,
            value;

        if (xml) {

            parseAttribute(pF.getXMLAttr(xml, "id"),     axis.id,     parseString);
            parseAttribute(pF.getXMLAttr(xml, "type"),   axis.type,   DataValue.parseType);
            parseAttribute(pF.getXMLAttr(xml, "length"), axis.length, parseDisplacement);

            //
            // The following provides support for the deprecated "positionbase" axis attribute;
            // MUGL files should use the "base" attribute instead.  When we're ready to remove
            // support for the deprecated attribute, delete this block of code:
            //
            (function () {
                var positionbase = pF.getXMLAttr(xml, "positionbase");
                if (positionbase) {
                    messageHandler.warning('Use of deprecated axis attribute "positionbase"; use "base" attribute instead');
                    if ((positionbase === "left") || (positionbase === "bottom")) {
                        axis.base(parsePoint("-1 -1"));
                    } else if (positionbase === "right") {
                        axis.base(parsePoint("1 -1"));
                    } else if (positionbase === "top") {
                        axis.base(parsePoint("-1 1"));
                    }
                }
            }());
            //
            // End of code to delete when removing support for deprecated "positionbase"
            // attribute.
            //

            attr = pF.getXMLAttr(xml, "position");
            if (attr !== undefined) {
                try {
                    axis.position(parsePoint(attr));
                } catch (e) {
                    // If position did not parse as a Point, and if it can be interpreted
                    // as a number, construct the position point by interpreting that
                    // number as an offset from the 0 location along the perpendicular
                    // direction.
                    value = parseInt(attr, 10);
                    if (value !== value) { // test for isNaN
                        throw e;
                    }
                    if (orientation === Axis.HORIZONTAL) {
                        axis.position(new Point(0, value));
                    } else {
                        axis.position(new Point(value, 0));
                    }
                }
            }

            axis.min(pF.getXMLAttr(xml, "min"));
            if (axis.min() !== "auto") {
                axis.dataMin(DataValue.parse(axis.type(), axis.min()));
            }
            axis.max(pF.getXMLAttr(xml, "max"));
            if (axis.max() !== "auto") {
                axis.dataMax(DataValue.parse(axis.type(), axis.max()));
            }

            parseAttribute(pF.getXMLAttr(xml, "pregap"),         axis.pregap,         parseFloat);
            parseAttribute(pF.getXMLAttr(xml, "postgap"),        axis.postgap,        parseFloat);
            parseAttribute(pF.getXMLAttr(xml, "anchor"),         axis.anchor,         parseFloat);
            parseAttribute(pF.getXMLAttr(xml, "base"),           axis.base,           parsePoint);
            parseAttribute(pF.getXMLAttr(xml, "minposition"),    axis.minposition,    parseDisplacement);
            parseAttribute(pF.getXMLAttr(xml, "maxposition"),    axis.maxposition,    parseDisplacement);
            parseAttribute(pF.getXMLAttr(xml, "minoffset"),      axis.minoffset,      parseFloat);
            parseAttribute(pF.getXMLAttr(xml, "maxoffset"),      axis.maxoffset,      parseFloat);
            parseAttribute(pF.getXMLAttr(xml, "color"),          axis.color,          parseRGBColor);
            parseAttribute(pF.getXMLAttr(xml, "tickcolor"),      axis.tickcolor,      parseRGBColor);
            parseAttribute(pF.getXMLAttr(xml, "tickwidth"),      axis.tickwidth,      parseInteger);
            parseAttribute(pF.getXMLAttr(xml, "tickmin"),        axis.tickmin,        parseInteger);
            parseAttribute(pF.getXMLAttr(xml, "tickmax"),        axis.tickmax,        parseInteger);
            parseAttribute(pF.getXMLAttr(xml, "highlightstyle"), axis.highlightstyle, parseString);
            parseAttribute(pF.getXMLAttr(xml, "linewidth"),      axis.linewidth,      parseInteger);
            
            child = xml.find("title");
            if (child.length > 0)                    { axis.title(AxisTitle.parseXML(child, axis));     }
            else                                     { axis.title(new AxisTitle(axis));               }
            child = xml.find("grid");
            if (child.length > 0)                    { axis.grid(Grid.parseXML(child));                 }
            child = xml.find("pan");
            if (child.length > 0)                    { axis.pan(Pan.parseXML(child, axis.type()));      }
            child = xml.find("zoom");
            if (child.length > 0)                    { axis.zoom(Zoom.parseXML(child, axis.type()));    }
            if (xml.find("labels").length > 0)       { parseLabels(xml, axis);                             }

            child = xml.find("binding");
            if (child.length > 0) {
                var bindingIdAttr  = pF.getXMLAttr(child,"id"),
                    bindingMinAttr = pF.getXMLAttr(child,"min"),
                    bindingMaxAttr = pF.getXMLAttr(child,"max"),
                    bindingMinDataValue = DataValue.parse(axis.type(), bindingMinAttr),
                    bindingMaxDataValue = DataValue.parse(axis.type(), bindingMaxAttr);
                if (typeof(bindingIdAttr) !== "string" || bindingIdAttr.length <= 0) {
                    throw new Error("invalid axis binding id: '" + bindingIdAttr + "'");
                }
                if (! DataValue.isInstance(bindingMinDataValue)) {
                    throw new Error("invalid axis binding min: '" + bindingMinAttr + "'");
                }
                if (! DataValue.isInstance(bindingMaxDataValue)) {
                    throw new Error("invalid axis binding max: '" + bindingMaxAttr + "'");
                }
                AxisBinding.findByIdOrCreateNew(bindingIdAttr).addAxis(axis, bindingMinDataValue, bindingMaxDataValue, multigraph);
            }

        }
        return axis;
    };

    return Axis;
};

},{"../core/axis.js":19,"../core/axis_binding.js":20,"../core/axis_title.js":21,"../core/data_value.js":29,"../core/grid.js":41,"../core/labeler.js":44,"../core/pan.js":51,"../core/zoom.js":70,"../math/displacement.js":100,"../math/point.js":103,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131,"../util/utilityFunctions.js":132}],107:[function(require,module,exports){
var AxisTitle = require('../core/axis_title.js');

AxisTitle.parseXML = function (xml, axis) {
    var title = new AxisTitle(axis),
        Text = require('../core/text.js'),
        Point = require('../math/point.js'),
        pF = require('../util/parsingFunctions.js'),
        nonEmptyTitle = false,
        parsePoint = Point.parse,
        text,
        parseTitleAttribute = function (value, attribute, preprocessor) {
            if (pF.parseAttribute(value, attribute, preprocessor)) {
                // No.  Don't count the title as nonEmpty just because of attributes.
                // If a <title> tag has only attributes, and no content, this
                // function should return `undefined` so that the normalizer won't
                // come along later and populate the title content with the axis id.
                // Empty <title> content means don't draw a title at all, in which
                // case it's OK to just forget about any attributes that were set.
                //nonEmptyTitle = true;
            }
        };

    if (xml) {
        text = xml.text();
        if (text !== "") {
            title.content(new Text(text));
            nonEmptyTitle = true;
        }
        parseTitleAttribute(pF.getXMLAttr(xml,"anchor"),   title.anchor,   parsePoint);
        parseTitleAttribute(pF.getXMLAttr(xml,"base"),     title.base,     parseFloat);
        parseTitleAttribute(pF.getXMLAttr(xml,"position"), title.position, parsePoint);
        parseTitleAttribute(pF.getXMLAttr(xml,"angle"),    title.angle,    parseFloat);
    }

    if (nonEmptyTitle === true) { 
        return title;
    }
    return undefined;
};

module.exports = AxisTitle;

},{"../core/axis_title.js":21,"../core/text.js":63,"../math/point.js":103,"../util/parsingFunctions.js":131}],108:[function(require,module,exports){
var Background = require('../core/background.js');

Background.parseXML = function (xml, multigraph) {
    var background       = new Background(),
        pF               = require('../util/parsingFunctions.js'),
        RGBColor         = require('../math/rgb_color.js'),
        Img              = require('../core/img.js'),
        child;

    if (xml) {
        pF.parseAttribute(pF.getXMLAttr(xml,"color"), background.color, RGBColor.parse);
        child = xml.find("img");
        if (child.length > 0) {
            background.img(Img.parseXML(child, multigraph));
        }
    }
    return background;
};

module.exports = Background;

},{"../core/background.js":22,"../core/img.js":43,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],109:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Data = require('../core/data.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Data.parseXML)==="function") { return Data; };

    Data.parseXML = function (xml, multigraph, messageHandler) {
        var ArrayData = require('../core/array_data.js'),
            DataVariable = require('../core/data_variable.js'),
            DataMeasure = require('../core/data_measure.js'),
            PeriodicArrayData = require('../core/periodic_array_data.js'),
            CSVData = require('../core/csv_data.js')($),
            WebServiceData = require('../core/web_service_data.js')($),
            Multigraph = require('../core/multigraph.js')($),
            pF = require('../util/parsingFunctions.js'),
            variables_xml,
            defaultMissingvalueString,
            defaultMissingopString,
            dataVariables = [],
            data,
            adap, adapter = ArrayData;

        if (xml) {

            adap = pF.getXMLAttr($(xml),"adapter");
            if (adap !== undefined && adap !== "") {
                adapter = Multigraph.getDataAdapter(adap);
                if (adapter === undefined) {
                    throw new Error("Missing data adapater: " + adap);
                }
            }

            // parse the <variables> section
            variables_xml = xml.find("variables");
            defaultMissingvalueString = pF.getXMLAttr(variables_xml,"missingvalue");
            defaultMissingopString    = pF.getXMLAttr(variables_xml,"missingop");

            var variables = variables_xml.find(">variable");
            if (variables.length > 0) {
                $.each(variables, function (i, e) {
                    dataVariables.push( DataVariable.parseXML($(e)) );
                });
            }

            // check to see if we have a <repeat> section, and if so, grab the period from it
            var haveRepeat = false,
                period,
                repeat_xml = $(xml.find(">repeat"));
            if (repeat_xml.length > 0) {
                var periodString = pF.getXMLAttr($(repeat_xml),"period");
                if (periodString === undefined || periodString === "") {
                    messageHandler.warning("<repeat> tag requires a 'period' attribute; data treated as non-repeating");
                } else {
                    period = DataMeasure.parse(dataVariables[0].type(),
                                               periodString);
                    haveRepeat = true;
                }
            }

            // if we have a <values> section, parse it and return an ArrayData instance:
            var values_xml = $(xml.find(">values"));
            if (values_xml.length > 0) {
                values_xml = values_xml[0];
                var stringValues = adapter.textToStringArray(dataVariables, $(values_xml).text());
                if (haveRepeat) {
                    data = new PeriodicArrayData(dataVariables, stringValues, period);
                } else {
                    data = new ArrayData(dataVariables, stringValues);
                }
            }

            // if we have a <csv> section, parse it and return a CSVData instance:
            var csv_xml = $(xml.find(">csv"));
            if (csv_xml.length > 0) {
                csv_xml = csv_xml[0];
                var filename = pF.getXMLAttr($(csv_xml),"location");
                data = new CSVData(dataVariables,
                                   multigraph ? multigraph.rebaseUrl(filename) : filename,
                                   messageHandler,
                                   multigraph ? multigraph.getAjaxThrottle(filename) : undefined);
            }

            // if we have a <service> section, parse it and return a WebServiceData instance:
            var service_xml = $(xml.find(">service"));
            if (service_xml.length > 0) {
                service_xml = $(service_xml[0]);
                var location = pF.getXMLAttr(service_xml,"location");
                data = new WebServiceData(dataVariables,
                                          multigraph ? multigraph.rebaseUrl(location) : location,
                                          messageHandler,
                                          multigraph ? multigraph.getAjaxThrottle(location) : undefined);
                var format = pF.getXMLAttr(service_xml,"format");
                if (format) {
                    data.format(format);
                }
            }
        }

        if (data) {
            if (defaultMissingvalueString !== undefined) {
                data.defaultMissingvalue(defaultMissingvalueString);
            }
            if (defaultMissingopString !== undefined) {
                data.defaultMissingop(defaultMissingopString);
            }
            data.adapter(adapter);
        }

        return data;
    };

    return Data;
};


},{"../core/array_data.js":18,"../core/csv_data.js":24,"../core/data.js":25,"../core/data_measure.js":27,"../core/data_variable.js":30,"../core/multigraph.js":47,"../core/periodic_array_data.js":52,"../core/web_service_data.js":66,"../util/parsingFunctions.js":131}],110:[function(require,module,exports){
var DataVariable = require('../core/data_variable.js');

DataVariable.parseXML = function (xml, data) {
    var variable,
        pF = require('../util/parsingFunctions.js'),
        parseAttribute   = pF.parseAttribute,
        DataValue        = require('../core/data_value.js'),
        attr;

    if (xml && pF.getXMLAttr(xml,"id")) {
        variable = new DataVariable(pF.getXMLAttr(xml,"id"));
        parseAttribute(pF.getXMLAttr(xml,"column"),       variable.column,       pF.parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"type"),         variable.type,         DataValue.parseType);
        //parseAttribute(pF.getXMLAttr(xml,"missingvalue"), variable.missingvalue, pF.parseDataValue(variable.type()));
        parseAttribute(pF.getXMLAttr(xml,"missingvalue"), variable.missingvalue, function(v) { return DataValue.parse(variable.type(), v); });
        parseAttribute(pF.getXMLAttr(xml,"missingop"),    variable.missingop,    DataValue.parseComparator);
    }
    return variable;
};

module.exports = DataVariable;

},{"../core/data_value.js":29,"../core/data_variable.js":30,"../util/parsingFunctions.js":131}],111:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Datatips = require('../core/datatips.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Datatips.parseXML)==="function") { return Datatips; };

    Datatips.parseXML = function (xml) {
        var datatips         = new Datatips(),
            RGBColor         = require('../math/rgb_color.js'),
            DatatipsVariable = require('../core/datatips_variable.js'),
            pF = require('../util/parsingFunctions.js'),
            parseRGBColor    = RGBColor.parse,
            parseAttribute   = pF.parseAttribute,
            parseInteger     = pF.parseInteger,
            parseString      = pF.parseString,
            child;
        if (xml) {
            child = xml.find("variable");
            if (child.length > 0) {
                $.each(child, function (i, e) {
                    datatips.variables().add( DatatipsVariable.parseXML($(e)) );
                });
            }
            
            parseAttribute(pF.getXMLAttr(xml,"format"),      datatips.format,      parseString);
            parseAttribute(pF.getXMLAttr(xml,"bgcolor"),     datatips.bgcolor,     parseRGBColor);
            parseAttribute(pF.getXMLAttr(xml,"bgalpha"),     datatips.bgalpha,     parseString);
            parseAttribute(pF.getXMLAttr(xml,"border"),      datatips.border,      parseInteger);
            parseAttribute(pF.getXMLAttr(xml,"bordercolor"), datatips.bordercolor, parseRGBColor);
            parseAttribute(pF.getXMLAttr(xml,"pad"),         datatips.pad,         parseInteger);
        }
        return datatips;
    };

    return Datatips;
};

},{"../core/datatips.js":31,"../core/datatips_variable.js":32,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],112:[function(require,module,exports){
var DatatipsVariable = require('../core/datatips_variable.js');

DatatipsVariable.parseXML = function (xml) {
    var variable = new DatatipsVariable(),
        pF = require('../util/parsingFunctions.js');

    if (xml) {
        pF.parseAttribute(pF.getXMLAttr(xml,"format"), variable.format, pF.parseString);
    }
    return variable;
};

module.exports = DatatipsVariable;

},{"../core/datatips_variable.js":32,"../util/parsingFunctions.js":131}],113:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Filter = require('../core/filter.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Filter.parseXML)==="function") { return Filter; };

    Filter.parseXML = function (xml) {
        var filter = new Filter(),
            FilterOption = require('../core/filter_option.js'),
            pF = require('../util/parsingFunctions.js'),
            child;
        if (xml) {
            child = xml.find("option");
            if (child.length > 0) {
                $.each(child, function (i, e) {
                    filter.options().add( FilterOption.parseXML($(e)) );
                });
            }
            pF.parseAttribute(pF.getXMLAttr(xml,"type"), filter.type, pF.parseString);
        }
        return filter;
    };

    return Filter;
};


},{"../core/filter.js":38,"../core/filter_option.js":39,"../util/parsingFunctions.js":131}],114:[function(require,module,exports){
var FilterOption = require('../core/filter_option.js');

FilterOption.parseXML = function (xml) {
    var pF     = require('../util/parsingFunctions.js'),
        option = new FilterOption();
    if (xml) {
        option.name(pF.getXMLAttr(xml,"name"));
        option.value(pF.getXMLAttr(xml,"value") === "" ? undefined : pF.getXMLAttr(xml,"value"));
    }
    return option;
};

module.exports = FilterOption;

},{"../core/filter_option.js":39,"../util/parsingFunctions.js":131}],115:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Graph = require('../core/graph.js'),
        pF = require('../util/parsingFunctions.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Graph.parseXML)==="function") { return Graph; };

    /*
     * This function traverses an XML document looking for attributes values involving deprecated
     * color names and issues a warning about each one found.  Remove this function when removing
     * support for these names.  See src/math/rgb_color.js for a list of the deprecated colors.
     */
    var checkDeprecatedColorNames = function (xml, messageHandler) {
        var RGBColor   = require('../math/rgb_color.js'),
            $xml       = $(xml),
            attributes = $xml[0].attributes,
            children   = $xml.children(),
            colorNameIsDeprecated = RGBColor.colorNameIsDeprecated,
            dep;
        if (xml.nodeName === "option") {
            if (/color/.test(pF.getXMLAttr($xml,'name'))) {
                dep = colorNameIsDeprecated(pF.getXMLAttr($xml,'value'));
                if (dep) {
                    messageHandler.warning('Warning: color string "' + pF.getXMLAttr($xml,'value') + '" is deprecated; use "' + dep + '" instead');
                }
            }
        }
        if (attributes) {
            $.each(attributes, function () {
                if (/color/.test(this.name)) {
                    dep = colorNameIsDeprecated(this.value);
                    if (dep) {
                        messageHandler.warning('Warning: color string "' + this.value + '" is deprecated; use "' + dep + '" instead');
                    }
                }
            });

        }
        if (children) {
            children.each(function () {
                checkDeprecatedColorNames(this, messageHandler);
            });
        }
    };


    Graph.parseXML = function (xml, multigraph, messageHandler) {
        var graph = new Graph(),
            Axis  = require('../core/axis.js'),
            Window = require('../core/window.js'),
            Legend = require('../core/legend.js'),
            Background = require('../core/background.js'),
            Plotarea = require('../core/plotarea.js'),
            Title = require('../core/title.js'),
            Data = require('../core/data.js'),
            Plot = require('../core/plot.js'),
            utilityFunctions = require('../util/utilityFunctions.js'),
            defaults = utilityFunctions.getDefaultValuesFromXSD(),
            child;

        graph.multigraph(multigraph);
        if (xml) {

            //
            // Delete this try/catch block when removing support for deprecated color names.
            //
            try {
                checkDeprecatedColorNames(xml, messageHandler);
            } catch (e) {
                // just ignore any errors here; the worst that will happen is that the user just
                // won't see the warnings
            }
            //
            // end of block to delete when removing support for deprecated color names
            //

            // NOTE: 'OBJ.find(">TAG")' returns a list of JQuery objects corresponding to the immediate
            // (1st generation) child nodes of OBJ corresponding to xml tag TAG
            child = xml.find(">window");
            if (child.length > 0) {
                graph.window( Window.parseXML(child) );
            }

            child = xml.find(">legend");
            if (child.length > 0) {
                graph.legend( Legend.parseXML(child) );
            } else {
                graph.legend( Legend.parseXML() );
            }
            child = xml.find(">background");
            if (child.length > 0) {
                graph.background( Background.parseXML(child, graph.multigraph()) );
            }
            child = xml.find(">plotarea");
            if (child.length > 0) {
                graph.plotarea( Plotarea.parseXML(child) );
            }
            child = xml.find(">title");
            if (child.length > 0) {
                graph.title( Title.parseXML(child, graph) );
            }
            $.each(xml.find(">horizontalaxis"), function (i, e) {
                graph.axes().add( Axis.parseXML($(e), Axis.HORIZONTAL, messageHandler, graph.multigraph()) );
            });
            $.each(xml.find(">verticalaxis"), function (i, e) {
                graph.axes().add( Axis.parseXML($(e), Axis.VERTICAL, messageHandler, graph.multigraph()) );
            });
            /*
             if (xml.find(">data").length === 0) {
             // On second throught, let's not throw an error if no <data> tag
             // is specified, because conceivably there could be graphs in
             // which all the plots are constant plots, so no data is needed.
             // In particular, in our spec/mugl/constant-plot.xml test!
             // I'm not sure what should be done here --- maybe issue a warning,
             // or maybe don't do anything.
             //    mbp Mon Nov 12 16:05:21 2012
             //throw new Error("Graph Data Error: No data tags specified");
             }
             */
            $.each(xml.find(">throttle"), function (i, e) {
                var pattern    = pF.getXMLAttr($(e),'pattern')    ? pF.getXMLAttr($(e),'pattern')    : defaults.throttle.pattern,
                    requests   = pF.getXMLAttr($(e),'requests')   ? pF.getXMLAttr($(e),'requests')   : defaults.throttle.requests,
                    period     = pF.getXMLAttr($(e),'period')     ? pF.getXMLAttr($(e),'period')     : defaults.throttle.period,
                    concurrent = pF.getXMLAttr($(e),'concurrent') ? pF.getXMLAttr($(e),'concurrent') : defaults.throttle.concurrent;
                multigraph.addAjaxThrottle(pattern, requests, period, concurrent);
            });
            $.each(xml.find(">data"), function (i, e) {
                graph.data().add( Data.parseXML($(e), graph.multigraph(), messageHandler) );
            });
            $.each(xml.find(">plot"), function (i, e) {
                graph.plots().add( Plot.parseXML($(e), graph, messageHandler) );
            });
            graph.postParse();
        }
        return graph;
    };

    return Graph;
};

},{"../core/axis.js":19,"../core/background.js":22,"../core/data.js":25,"../core/graph.js":40,"../core/legend.js":45,"../core/plot.js":53,"../core/plotarea.js":55,"../core/title.js":64,"../core/window.js":69,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131,"../util/utilityFunctions.js":132}],116:[function(require,module,exports){
var Grid = require('../core/grid.js');

Grid.parseXML = function (xml) {
    var grid             = new Grid(),
        RGBColor         = require('../math/rgb_color.js'),
        pF               = require('../util/parsingFunctions.js'),
        parseAttribute   = pF.parseAttribute,
        attr;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"color"), grid.color, RGBColor.parse);
        //NOTE: visible attribute should default to true when parsing, so that
        //      the presence of a <grid> tag at all will turn on a grid.  In
        //      the Grid object itself, though, the default for the visible
        //      attribute is false, so that when we create a default grid object
        //      in code (as opposed to parsing), it defaults to not visible.
        attr = pF.getXMLAttr(xml,"visible");
        if (attr !== undefined) {
            grid.visible(pF.parseBoolean(attr));
        } else {
            grid.visible(true);
        }
    }
    return grid;
};

module.exports = Grid;

},{"../core/grid.js":41,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],117:[function(require,module,exports){
var Icon = require('../core/icon.js');

Icon.parseXML = function (xml) {
    var icon = new Icon(),
        pF = require('../util/parsingFunctions.js'),
        parseAttribute   = pF.parseAttribute,
        parseInteger     = pF.parseInteger;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"height"), icon.height, parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"width"),  icon.width,  parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"border"), icon.border, parseInteger);
    }
    return icon;
};

module.exports = Icon;

},{"../core/icon.js":42,"../util/parsingFunctions.js":131}],118:[function(require,module,exports){
var Img = require('../core/img.js');

Img.parseXML = function (xml, multigraph) {
    var img,
        pF = require('../util/parsingFunctions.js'),
        Point            = require('../math/point.js'),
        parseAttribute   = pF.parseAttribute,
        parsePoint       = Point.parse;
    if (xml && pF.getXMLAttr(xml,"src") !== undefined) {
        var src = pF.getXMLAttr(xml,"src");
        if (!src) {
            throw new Error('img elment requires a "src" attribute value');
        }
        if (multigraph) {
            src = multigraph.rebaseUrl(src);
        }
        img = new Img(src);
        parseAttribute(pF.getXMLAttr(xml,"anchor"),   img.anchor,   parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"base"),     img.base,     parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"position"), img.position, parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"frame"),    img.frame,    function (value) { return value.toLowerCase(); });
    }
    return img;
};

module.exports = Img;

},{"../core/img.js":43,"../math/point.js":103,"../util/parsingFunctions.js":131}],119:[function(require,module,exports){
// usage:
// 
//   A valid jQuery object must be passed to the function returned by requiring this file.
//   That function returns a ParseXML object that can be used as follows:
//
//      var ParseXML = require('parse_xml.js')($);
//      ParseXML.stringToJQueryXMLObj(...);
//
var JQueryXMLParser;
module.exports = function($) {
    if (typeof(JQueryXMLParser)!="undefined") { return JQueryXMLParser; };

    JQueryXMLParser = {};

    require('./axis.js')($);
    require('./data.js')($);
    require('./datatips.js')($);
    require('./filter.js')($);
    require('./graph.js')($);
    require('./multigraph.js')($);
    require('./plot.js')($);
    require('./renderer.js')($);

    require('./axis_title.js');
    require('./background.js');
    require('./datatips_variable.js');
    require('./data_variable.js');
    require('./filter_option.js');
    require('./grid.js');
    require('./icon.js');
    require('./img.js');
    require('./labeler.js');
    require('./legend.js');
    require('./pan.js');
    require('./plotarea.js');
    require('./plot_legend.js');
    require('./title.js');
    require('./window.js');
    require('./zoom.js');

    JQueryXMLParser.stringToJQueryXMLObj = function (thingy) {
        if (typeof(thingy) !== "string") {
            return $(thingy);
        }
        var xml = $.parseXML(thingy);
        return $($(xml).children()[0]);
    };

    return JQueryXMLParser;
};

},{"./axis.js":106,"./axis_title.js":107,"./background.js":108,"./data.js":109,"./data_variable.js":110,"./datatips.js":111,"./datatips_variable.js":112,"./filter.js":113,"./filter_option.js":114,"./graph.js":115,"./grid.js":116,"./icon.js":117,"./img.js":118,"./labeler.js":120,"./legend.js":121,"./multigraph.js":122,"./pan.js":123,"./plot.js":124,"./plot_legend.js":125,"./plotarea.js":126,"./renderer.js":127,"./title.js":128,"./window.js":129,"./zoom.js":130}],120:[function(require,module,exports){
var Labeler = require('../core/labeler.js');

Labeler.parseXML = function (xml, axis, defaults, spacing) {
    // This parser takes an optional final argument, spacing, which is a string representing
    // the spacing to be parsed for the labeler.  If that argument is not present, the spacing
    // value is taken from the xml object.  If a spacing argument is present, it is parsed
    // and used to set the spacing attribute of the Labeler object, and in this case, any
    // spacing value present in the xml is ignored.
    //
    // If the spacing argument has the value null, the resulting labeler will have no spacing
    // attribute set at all.
    var labeler,
        Point = require('../math/point.js'),
        RGBColor = require('../math/rgb_color.js'),
        DataMeasure = require('../core/data_measure.js'),
        DataValue = require('../core/data_value.js'),
        DataFormatter = require('../core/data_formatter.js'),
        pF = require('../util/parsingFunctions.js'),
        parsePoint = Point.parse;

    // `parseAttribute` returns true or false depending on whether or not it set the attribute.
    // If it did not and if the `defaults` object exists then the attribute is set to the
    // appropriate default value.
    var parseLabelerAttribute = function (value, attribute, preprocessor, defaultName) {
        if (!pF.parseAttribute(value, attribute, preprocessor) && defaults !== undefined) {
            attribute(defaults[defaultName]());
        }
    };
    var parseDataFormatter = function (type) {
        return function (value) {
            return DataFormatter.create(type, value);
        };
    };
    var parseDataValue = function (type) {
        return function (value) {
            return DataValue.parse(type, value);
        };
    };

    if (xml) {
        labeler = new Labeler(axis);
        if (spacing !== null) {
            if (spacing === undefined) {
                spacing = pF.getXMLAttr(xml,"spacing");
            }
            //NOTE: spacing might still === undefined at this point
            parseLabelerAttribute(spacing, labeler.spacing,
                                  function(v) { return DataMeasure.parse(axis.type(), v); }, //pF.parseDataMeasure(),
                                  "spacing");
        }
        parseLabelerAttribute(pF.getXMLAttr(xml,"format"),        labeler.formatter,     parseDataFormatter(axis.type()),              "formatter");
        parseLabelerAttribute(pF.getXMLAttr(xml,"start"),         labeler.start,         parseDataValue(axis.type()),                  "start");
        parseLabelerAttribute(pF.getXMLAttr(xml,"angle"),         labeler.angle,         parseFloat,                                   "angle");
        parseLabelerAttribute(pF.getXMLAttr(xml,"position"),      labeler.position,      parsePoint,                                   "position");
        parseLabelerAttribute(pF.getXMLAttr(xml,"anchor"),        labeler.anchor,        parsePoint,                                   "anchor");
        parseLabelerAttribute(pF.getXMLAttr(xml,"densityfactor"), labeler.densityfactor, parseFloat,                                   "densityfactor");
        parseLabelerAttribute(pF.getXMLAttr(xml,"color"),         labeler.color,         RGBColor.parse,                               "color");
        parseLabelerAttribute(pF.getXMLAttr(xml,"visible"),       labeler.visible,       pF.parseBoolean,                "visible");

    }
    return labeler;
};

module.exports = Labeler;

},{"../core/data_formatter.js":26,"../core/data_measure.js":27,"../core/data_value.js":29,"../core/labeler.js":44,"../math/point.js":103,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],121:[function(require,module,exports){
var Legend = require('../core/legend.js');

Legend.parseXML = function (xml) {
    var legend           = new Legend(),
        pF               = require('../util/parsingFunctions.js'),
        Point            = require('../math/point.js'),
        RGBColor         = require('../math/rgb_color.js'),
        Icon             = require('../core/icon.js'),
        parseAttribute   = pF.parseAttribute,
        parseInteger     = pF.parseInteger,
        parsePoint       = Point.parse,
        parseRGBColor    = RGBColor.parse,
        child;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"visible"),      legend.visible,      pF.parseBoolean);
        parseAttribute(pF.getXMLAttr(xml,"base"),         legend.base,         parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"anchor"),       legend.anchor,       parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"position"),     legend.position,     parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"frame"),        legend.frame,        pF.parseString);
        parseAttribute(pF.getXMLAttr(xml,"color"),        legend.color,        parseRGBColor);
        parseAttribute(pF.getXMLAttr(xml,"bordercolor"),  legend.bordercolor,  parseRGBColor);
        parseAttribute(pF.getXMLAttr(xml,"opacity"),      legend.opacity,      parseFloat);
        parseAttribute(pF.getXMLAttr(xml,"border"),       legend.border,       parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"rows"),         legend.rows,         parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"columns"),      legend.columns,      parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"cornerradius"), legend.cornerradius, parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"padding"),      legend.padding,      parseInteger);

        child = xml.find("icon");
        if (child.length > 0) {
            legend.icon(Icon.parseXML(child));
        }
    }
    return legend;
};

module.exports = Legend;

},{"../core/icon.js":42,"../core/legend.js":45,"../math/point.js":103,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],122:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Multigraph = require('../core/multigraph.js')($);

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Multigraph.parseXML)==="function") { return Multigraph; };

    Multigraph.parseXML = function (xml, mugl, messageHandler) {
        var multigraph = new Multigraph(),
            graphs     = multigraph.graphs(),
            Graph      = require('../core/graph.js'),
            child;
        multigraph.mugl(mugl); // set the mugl url
        if (xml) {
            child = xml.find(">graph");
            if (child.length > 0) {
                $.each(child, function (i, e) {
                    graphs.add( Graph.parseXML($(e), multigraph, messageHandler) );
                });
            } else if (child.length === 0 && xml.children().length > 0) {
                graphs.add( Graph.parseXML(xml, multigraph, messageHandler) );
            }
        }
        return multigraph;
    };

    return Multigraph;
};

},{"../core/graph.js":40,"../core/multigraph.js":47}],123:[function(require,module,exports){
var Pan = require('../core/pan.js');

Pan.parseXML = function (xml, type) {
    var pan            = new Pan(),
        pF             = require('../util/parsingFunctions.js'),
        DataValue      = require('../core/data_value.js'),
        parseAttribute = pF.parseAttribute,
        parseDataValue = function(v) { return DataValue.parse(type, v); };
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"allowed"), pan.allowed, pF.parseBoolean);
        parseAttribute(pF.getXMLAttr(xml,"min"),     pan.min,     parseDataValue);
        parseAttribute(pF.getXMLAttr(xml,"max"),     pan.max,     parseDataValue);
    }
    return pan;
};

module.exports = Pan;

},{"../core/data_value.js":29,"../core/pan.js":51,"../util/parsingFunctions.js":131}],124:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Plot = require('../core/plot.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Plot.parseXML)==="function") { return Plot; };

    Plot.parseXML = function (xml, graph, messageHandler) {
        var DataPlot     = require('../core/data_plot.js'),
            PlotLegend   = require('../core/plot_legend.js'),
            ConstantPlot = require('../core/constant_plot.js'),
            DataValue    = require('../core/data_value.js'),
            Renderer     = require('../core/renderer.js'),
            Filter       = require('../core/filter.js'),
            Datatips     = require('../core/datatips.js'),
            pF           = require('../util/parsingFunctions.js'),
            plot,
            haxis,
            vaxis,
            variable,
            attr, child;
        if (xml) {

            // populate verticalaxis from xml
            child = xml.find(">verticalaxis");
            if (child.length === 1 && pF.getXMLAttr(child,"ref") !== undefined) {
                if (graph) {
                    vaxis = graph.axisById(pF.getXMLAttr(child,"ref"));
                    if (vaxis === undefined) {
                        throw new Error("Plot Vertical Axis Error: The graph does not contain an axis with an id of '" + pF.getXMLAttr(child,"ref") + "'");
                    }
                }
            }

            child = xml.find("verticalaxis constant");
            if (child.length > 0) {
                var constantValueString = pF.getXMLAttr(child,"value");
                if (constantValueString === undefined) {
                    throw new Error("Constant Plot Error: A 'value' attribute is needed to define a Constant Plot");
                }
                plot = new ConstantPlot(DataValue.parse(vaxis.type(), constantValueString));
            } else {
                plot = new DataPlot();
            }

            plot.verticalaxis(vaxis);

            // populate horizontalaxis from xml
            child = xml.find(">horizontalaxis");
            if (child.length === 1 && pF.getXMLAttr(child,"ref") !== undefined) {
                if (graph) {
                    haxis = graph.axisById(pF.getXMLAttr(child,"ref"));
                    if (haxis !== undefined) {
                        plot.horizontalaxis(haxis);
                    } else {
                        throw new Error("Plot Horizontal Axis Error: The graph does not contain an axis with an id of '" + pF.getXMLAttr(child,"ref") + "'");
                    }
                }
            }

            // if this is a DataPlot, parse variables
            if (plot instanceof DataPlot) {

                // provide default horizontalaxis variable if not present in xml
                if (xml.find("horizontalaxis variable").length === 0) {
                    plot.variable().add(null);
                }

                //TODO: defer population of variables until normalizer has executed
                // populate axis variables from xml
                child = xml.find("horizontalaxis variable, verticalaxis variable");
                if (child.length > 0) {
                    if (graph) {
                        $.each(child, function (i, e) {
                            attr = pF.getXMLAttr($(e),"ref");
                            variable = graph.variableById( attr );
                            if (variable !== undefined) {
                                plot.data( variable.data() );
                                plot.variable().add(variable);
                            } else {
                                throw new Error("Plot Variable Error: No Data tag contains a variable with an id of '" + attr + "'");
                            }
                        });
                    }
                }
            }

            // populate legend from xml
            child = xml.find("legend");
            if (child.length > 0) {
                plot.legend(PlotLegend.parseXML(child, plot));
            } else {
                plot.legend(PlotLegend.parseXML(undefined, plot));
            }

            // populate renderer from xml
            child = xml.find("renderer");
            if (child.length > 0) {
                plot.renderer(Renderer.parseXML(child, plot, messageHandler));
            }

            // populate filter from xml
            child = xml.find("filter");
            if (child.length > 0) {
                plot.filter(Filter.parseXML(child));
            }

            // populate datatips from xml
            child = xml.find("datatips");
            if (child.length > 0) {
                plot.datatips(Datatips.parseXML(child));
            }

        }
        return plot;
    };

    return Plot;
};

},{"../core/constant_plot.js":23,"../core/data_plot.js":28,"../core/data_value.js":29,"../core/datatips.js":31,"../core/filter.js":38,"../core/plot.js":53,"../core/plot_legend.js":54,"../core/renderer.js":56,"../util/parsingFunctions.js":131}],125:[function(require,module,exports){
var PlotLegend = require('../core/plot_legend.js');

PlotLegend.parseXML = function (xml, plot) {
    var legend           = new PlotLegend(),
        pF               = require('../util/parsingFunctions.js'),
        Text             = require('../core/text.js'),
        parseAttribute   = pF.parseAttribute,
        child;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"visible"), legend.visible, pF.parseBoolean);
        parseAttribute(pF.getXMLAttr(xml,"label"),   legend.label,   function (value) { return new Text(value); });
    }

    if (legend.label() === undefined) {
        // TODO: remove this ugly patch with something that works properly
        if (typeof(plot.variable)==="function" && plot.variable().size() >= 2) { 
            legend.label(new Text(plot.variable().at(1).id()));
        } else {
            legend.label(new Text("plot"));
        }
    }
    return legend;
};

module.exports = PlotLegend;

},{"../core/plot_legend.js":54,"../core/text.js":63,"../util/parsingFunctions.js":131}],126:[function(require,module,exports){
var Plotarea = require('../core/plotarea.js');

Plotarea.parseXML = function (xml) {
    var plotarea = new Plotarea(),
        margin = plotarea.margin(),
        pF               = require('../util/parsingFunctions.js'),
        RGBColor         = require('../math/rgb_color.js'),
        parseRGBColor    = RGBColor.parse,
        parseAttribute   = pF.parseAttribute,
        parseInteger     = pF.parseInteger;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"marginbottom"), margin.bottom,        parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"marginleft"),   margin.left,          parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"margintop"),    margin.top,           parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"marginright"),  margin.right,         parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"border"),       plotarea.border,      parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"color"),        plotarea.color,       parseRGBColor);
        parseAttribute(pF.getXMLAttr(xml,"bordercolor"),  plotarea.bordercolor, parseRGBColor);
    }
    return plotarea;
};

module.exports = Plotarea;

},{"../core/plotarea.js":55,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],127:[function(require,module,exports){
// This file uses jQuery.  A valid jQuery object must be passed to the
// function returned by requiring this file.
module.exports = function($) {
    var Renderer = require('../core/renderer.js');

    // if parseXML method already has been defined, which would be the case if this
    // function was previously called, just return immediately
    if (typeof(Renderer.parseXML)==="function") { return Renderer; };

    Renderer.parseXML = function (xml, plot, messageHandler) {
        var DataValue   = require('../core/data_value.js'),
            NumberValue = require('../core/number_value.js'),
            Warning     = require('../core/warning.js'),
            pF          = require('../util/parsingFunctions.js'),
            rendererType,
            renderer,
            opt;

        require('../core/renderers/all_renderers.js');

        if (xml && pF.getXMLAttr(xml,"type") !== undefined) {
            rendererType = Renderer.Type.parse(pF.getXMLAttr(xml,"type"));
            if (!Renderer.Type.isInstance(rendererType)) {
                throw new Error("unknown renderer type '" + pF.getXMLAttr(xml,"type") + "'");
            }
            renderer = Renderer.create(rendererType);
            renderer.plot(plot);
            if (xml.find("option").length > 0) {

                //
                // The following provides support for deprecatd the "missingvalue" and
                // "missingop" renderer options.  Those options are not officially supported
                // any more; MUGL files should use the  missingvalue/missingop attributes
                // of <data><variable> or <data><variables> instead.  When we're ready to
                // remove this support, delete the block of code:
                //
                (function (renderer, xml, plot, messageHandler) {
                    var i,
                        missingValueOption = xml.find("option[name=missingvalue]"),
                        missingOpOption    = xml.find("option[name=missingop]");
                    if (missingValueOption.length > 0 || missingOpOption.length > 0) {
                        var columns = plot.data().columns(),
                            column;
                        for (i = 0; i < columns.size();  ++i) {
                            column = columns.at(i);
                            if (column.type() === DataValue.NUMBER) {
                                if (missingValueOption.length > 0 && (column.missingvalue() === undefined)) {
                                    column.missingvalue(NumberValue.parse(pF.getXMLAttr(missingValueOption,"value")));
                                }
                                if (missingOpOption.length > 0 && (column.missingop() === undefined)) {
                                    column.missingop(DataValue.parseComparator(pF.getXMLAttr(missingOpOption,"value")));
                                }
                            }
                        }
                    }
                    if (missingValueOption.length > 0) {
                        messageHandler.warning("Renderer option 'missingvalue' is deprecated; " +
                                               "use 'missingvalue' attribute of 'data'/'variable'; instead");
                        // remove the element from the xml so that the option-processing code below doesn't see it
                        missingValueOption.remove();
                    }
                    if (missingOpOption.length > 0) {
                        messageHandler.warning("Renderer option 'missingop' is deprecated; " +
                                               "use 'missingvalue' attribute of 'data'/'variable'; instead");
                        // remove the element from the xml so that the option-processing code below doesn't see it
                        missingOpOption.remove();
                    }
                }(renderer, xml, plot, messageHandler));
                //
                // End of code to delete when removing support for deprecated
                // missingvalue/missingop renderer options.
                //

                $.each(xml.find(">option"), function (i, e) {
                    try {
                        renderer.setOptionFromString(pF.getXMLAttr($(e),"name"),
                                                     pF.getXMLAttr($(e),"value"),
                                                     pF.getXMLAttr($(e),"min"),
                                                     pF.getXMLAttr($(e),"max"));
                    } catch (e) {
                        if (e instanceof Warning) {
                            messageHandler.warning(e);
                        } else {
                            throw e;
                        }
                    }
                });
            }
        }
        return renderer;
    };

    return Renderer;
};

},{"../core/data_value.js":29,"../core/number_value.js":50,"../core/renderer.js":56,"../core/renderers/all_renderers.js":57,"../core/warning.js":65,"../util/parsingFunctions.js":131}],128:[function(require,module,exports){
var Title = require('../core/title.js');

Title.parseXML = function (xml, graph) {
    var Point            = require('../math/point.js'),
        RGBColor         = require('../math/rgb_color.js'),
        Text             = require('../core/text.js'),
        pF               = require('../util/parsingFunctions.js'),
        parsePoint       = Point.parse,
        parseRGBColor    = RGBColor.parse,
        parseAttribute   = pF.parseAttribute,
        parseInteger     = pF.parseInteger,
        title;

    if (xml) {
        var text = xml.text();
        if (text !== "") {
            title = new Title(new Text(text), graph);
        } else {
            return undefined;
        }                
        parseAttribute(pF.getXMLAttr(xml,"frame"),        title.frame,        function (value) { return value.toLowerCase(); });
        parseAttribute(pF.getXMLAttr(xml,"border"),       title.border,       parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"color"),        title.color,        parseRGBColor);
        parseAttribute(pF.getXMLAttr(xml,"bordercolor"),  title.bordercolor,  parseRGBColor);
        parseAttribute(pF.getXMLAttr(xml,"opacity"),      title.opacity,      parseFloat);
        parseAttribute(pF.getXMLAttr(xml,"padding"),      title.padding,      parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"cornerradius"), title.cornerradius, parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"anchor"),       title.anchor,       parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"base"),         title.base,         parsePoint);
        parseAttribute(pF.getXMLAttr(xml,"position"),     title.position,     parsePoint);
    }
    return title;
};

module.exports = Title;

},{"../core/text.js":63,"../core/title.js":64,"../math/point.js":103,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],129:[function(require,module,exports){
var Window = require('../core/window.js');

Window.parseXML = function (xml) {
    //WARNING: do not declare a local var named "window" here; it masks the global 'window' object,
    //  which screws up the references to window.multigraph.* below!
    var w = new Window(),
        RGBColor         = require('../math/rgb_color.js'),
        pF               = require('../util/parsingFunctions.js'),
        parseAttribute   = pF.parseAttribute,
        parseInteger     = pF.parseInteger,
        attr;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"width"),  w.width,  parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"height"), w.height, parseInteger);
        parseAttribute(pF.getXMLAttr(xml,"border"), w.border, parseInteger);

        attr = pF.getXMLAttr(xml,"margin");
        if (attr !== undefined) {
            (function (m) {
                w.margin().set(m,m,m,m);
            }(parseInt(attr, 10)));
        }

        attr = pF.getXMLAttr(xml,"padding");
        if (attr !== undefined) {
            (function (m) {
                w.padding().set(m,m,m,m);
            }(parseInt(attr, 10)));
        }

        // removed deprecated color name check from commit #17665e2
        //    jrfrimme Tues Apr 2 11:47 2013
        parseAttribute(pF.getXMLAttr(xml,"bordercolor"), w.bordercolor, RGBColor.parse);
    }
    return w;
};

module.exports = Window;

},{"../core/window.js":69,"../math/rgb_color.js":104,"../util/parsingFunctions.js":131}],130:[function(require,module,exports){
var Zoom = require('../core/zoom.js');

Zoom.parseXML = function (xml, type) {
    var zoom             = new Zoom(),
        DataValue        = require('../core/data_value.js'),
        DataMeasure      = require('../core/data_measure.js'),
        pF               = require('../util/parsingFunctions.js'),
        parseAttribute   = pF.parseAttribute,
        parseDataMeasure = function(v) { return DataMeasure.parse(type, v); }, //pF.parseDataMeasure
        attr;
    if (xml) {
        parseAttribute(pF.getXMLAttr(xml,"allowed"), zoom.allowed, pF.parseBoolean);
        parseAttribute(pF.getXMLAttr(xml,"min"),     zoom.min,     parseDataMeasure);
        parseAttribute(pF.getXMLAttr(xml,"max"),     zoom.max,     parseDataMeasure);
        attr = pF.getXMLAttr(xml,"anchor");
        if (attr !== undefined) {
            if (attr.toLowerCase() === "none") {
                zoom.anchor(null);
            } else {
                zoom.anchor( DataValue.parse(type, attr) );
            }
        }
    }
    return zoom;
};

module.exports = Zoom;

},{"../core/data_measure.js":27,"../core/data_value.js":29,"../core/zoom.js":70,"../util/parsingFunctions.js":131}],131:[function(require,module,exports){
var ParsingFunctions = {};

/**
 * The Utility Functions module provides utility functions which correspond to general concepts.
 *
 * @module multigraph
 * @submodule utilityfunctions
 * @main utilityfunctions
 */

/**
 * Functions which provide abstractions for the parser.
 *
 * @class ParsingFunctions
 * @for ParsingFunctions
 * @static
 */

/**
 * Abstract function for parsing and setting jermaine attributes which do not require
 * extremely complicated logic to determine their values. Any attributes which require
 * complex logic to determine their proper values should be explicitly set in the parser.
 *
 * @method parseAttribute
 * @param {String} value
 * @param {Function} attribute
 * @param {Function} preprocessor
 * @static
 * @return {Boolean}
 */
ParsingFunctions.parseAttribute = function (value, attribute, preprocessor) {
    if (value !== undefined) {
        attribute(preprocessor(value));
        return true;
    }
    return false;
};

/**
 * Parses String attributes.
 *
 * @method parseString
 * @param {String} value
 * @static
 * @return {String}
 */
ParsingFunctions.parseString = function (value) {
    return value;
};

/**
 * Parses a string argument with a radix of 10 and returns an integer.
 *
 * @method parseInteger
 * @param {String} value
 * @static
 * @return {Integer}
 */
ParsingFunctions.parseInteger = function (value) {
    return parseInt(value, 10);
};

//mbp
///**
// * Returns a curried function that parses a value into a DataValue of the specified type.
// *
// * @method parseDataValue
// * @param {String} type
// * @static
// * @return {Function}
// */
//ParsingFunctions.parseDataValue = function (type) {
//    return function (value) {
//        return window.multigraph.core.DataValue.parse(type, value);
//    };
//};

//mbp
///**
// * Returns a curried function that parses a value into a DataMeasure of the specified type.
// *
// * @method parseDataMeasure
// * @param {String} type
// * @static
// * @return {Function}
// */
//ParsingFunctions.parseDataMeasure = function (type) {
//    return function (value) {
//        return window.multigraph.core.DataMeasure.parse(type, value);
//    };
//};

/**
 * Parses the allowed Boolean Strings and returns the appropriate value. If the parameter
 * is not one of the allowed values then the parameter is returned as an error might not
 * need to be thrown immediately.
 *
 * @method parseBoolean
 * @param {String} param
 * @static
 * @return {Boolean}
 */
ParsingFunctions.parseBoolean = function (param) {
    switch (param.toLowerCase()) {
    case "true":
    case "yes":
        return true;
    case "false":
    case "no":
        return false;
    default:
        return param;
    }
};

/*
 * The ParsingFunctions.getXMLAttr() function returns the value of an attribute for
 * an XML document node.
 * 
 * The `node` argument should be a node in an XML document as returned by the jQuery
 * parseXML function.
 * 
 * The `attrname` argument should be a string which is the name of an attribute.
 * 
 * This function ensures to return "undefined" if the node does not have the attribute.
 * 
 * This function itself does not depend on jQuery, which is why it is located in this
 * file -- so that code needing to use this function don't have to require jQuery just
 * for this function.  (The use of this function does require jQuery at some point in
 * the program, because this `node` object must be a jQuery object representing an XML
 * document.)
 * 
 * The reason we have this function for extracting attribute values, rather than
 * just calling node.attr(attrname) directly, is that in some cases node.attr()
 * returns the empty string for attributes which have not been set.  This function
 * uses the hasAttribute() method to check to see whether the attribute value
 * is present, and always returns `undefined` if it is not.
 */
ParsingFunctions.getXMLAttr = function(node, attrname) {
    if (node.length >= 1 && node[0].hasAttribute(attrname)) {
        return node.attr(attrname);
    }
    return undefined;
};

module.exports = ParsingFunctions;

},{}],132:[function(require,module,exports){
utilityFunctions = {};

utilityFunctions.getKeys = function (obj) {
    var keys = [],
        key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            keys.push(key);
        }
    }
    return keys;
};

utilityFunctions.insertDefaults = function (elem, defaults, attributes) {
    var i;
    for (i = 0; i < attributes.length; i++) {
        if (defaults[attributes[i]] !== undefined && (typeof(defaults[attributes[i]]) !== "object" || defaults[attributes[i]] === null)) {
            if (elem.attributes().indexOf(attributes[i]) > -1) {
                elem.attribute(attributes[i]).defaultsTo(defaults[attributes[i]]);
            }
        }
    }
    return elem;
};

utilityFunctions.getDefaultValuesFromXSD = function () {
    
    var DatetimeValue = require('../core/datetime_value.js'),
        NumberValue = require('../core/number_value.js'),
        Displacement = require('../math/displacement.js'),
        Insets = require('../math/insets.js'),
        Point = require('../math/point.js'),
        RGBColor = require('../math/rgb_color.js');

    return {
        "window": {
            //              "width": undefined,
            //              "height": undefined,
            "border": 2,
            "margin" : function () { return new Insets(/*top*/2, /*left*/2, /*bottom*/2, /*right*/2); },
            "padding": function () { return new Insets(/*top*/5, /*left*/5, /*bottom*/5, /*right*/5); },
            "bordercolor": function () { return new RGBColor.parse("0x000000"); }
        },
        "legend": {
            "icon" : {
                "height": 30,
                "width": 40,
                "border": 1
            },
            "visible": null,
            "base": function () { return new Point(1,1); },
            "anchor": function () { return new Point(1,1); },
            "position": function () { return new Point(0,0); },
            "frame": "plot",
            "color": function () { return new RGBColor.parse("0xffffff"); },
            "bordercolor": function () { return new RGBColor.parse("0x000000"); },
            "opacity": 1.0,
            "border": 1,
            "rows": undefined,
            "columns": undefined,
            "cornerradius": 0,
            "padding": 0
        },
        "background": {
            "img": {
                "src": undefined,
                "anchor": function () { return new Point(-1,-1); },
                "base": function () { return new Point(-1,-1); },
                "position": function () { return new Point(0,0); },
                "frame": "padding"
            },
            "color": "0xffffff"
        },
        "plotarea": {
            "margin" : function () { return new Insets(/*top*/10 , /*left*/38, /*bottom*/35, /*right*/35); },
            "border": 0,
            "color" : null,
            "bordercolor": function () { return new RGBColor.parse("0xeeeeee"); }
        },
        "title": {
            "text"         : undefined,
            "frame"        : "padding",
            "border"       : 0,
            "color"        : function () { return new RGBColor.parse("0xffffff"); },
            "bordercolor"  : function () { return new RGBColor.parse("0x000000"); },
            "opacity"      : 1.0,
            "padding"      : 0,
            "cornerradius" : 15,
            "anchor"       : function () { return new Point(0,1); },
            "base"         : function () { return new Point(0,1); },
            "position"     : function () { return new Point(0,0); }
        },
        "horizontalaxis": {
            "title": {
                "content": undefined,
                //                    "fontname": "default",
                //                    "fontsize": "12",
                //                    "fontcolor": "0x000000",
                "anchor": undefined,
                "base" : 0,
                "position": undefined,

                "position-horizontal-top"    : function () { return new Point(0, 15); },
                "position-horizontal-bottom" : function () { return new Point(0, -18); },
                "position-vertical-right"    : function () { return new Point(33, 0); },
                "position-vertical-left"     : function () { return new Point(-25, 0); },

                "anchor-horizontal-top"      : function () { return new Point(0, -1); },
                "anchor-horizontal-bottom"   : function () { return new Point(0, 1); },
                "anchor-vertical-right"      : function () { return new Point(-1, 0); },
                "anchor-vertical-left"       : function () { return new Point(1, 0); },

                "angle": 0
            },
            "labels": {
                "label": {
                    "format": undefined,
                    // NOTE: the Labeler object's default values for position and anchor should be undefined.
                    //       If those attributes are not specified in the MUGL, the Labeler's
                    //       initializeGeometry() method sets them to one of the context-dependent values
                    //       below.
                    "position": undefined,
                    "anchor": undefined,

                    "position-horizontal-top"    : function () { return new Point(0, 5); },
                    "position-horizontal-bottom" : function () { return new Point(0, -5); },
                    "position-vertical-right"    : function () { return new Point(5, 0); },
                    "position-vertical-left"     : function () { return new Point(-8, 0); },

                    "anchor-horizontal-top"      : function () { return new Point(0, -1); },
                    "anchor-horizontal-bottom"   : function () { return new Point(0, 1); },
                    "anchor-vertical-right"      : function () { return new Point(-1, 0); },
                    "anchor-vertical-left"       : function () { return new Point(1, 0); },

                    "angle": 0.0,
                    "spacing": undefined,
                    "densityfactor": 1.0,
                    "color" : function () { return new RGBColor.parse("0x000000"); },
                    "visible" : true
                    //                        "fontname": undefined,
                    //                        "fontsize": undefined,
                    //                        "fontcolor": undefined
                },
                //                    "fontname": "default",
                //                    "fontsize": "12",
                //                    "fontcolor": "0x000000",
                //                    "format": "%1d",
                //                    "visible": "true",
                "start-number": function () { return new NumberValue(0); },
                "start-datetime": function () { return new DatetimeValue(0); },
                "angle": 0.0,
                "position": function () { return new Point(0,0); },
                "anchor": function () { return new Point(0,0); },
                "color" : function () { return new RGBColor.parse("0x000000"); },
                "visible" : true,
                "defaultNumberSpacing": "10000 5000 2000 1000 500 200 100 50 20 10 5 2 1 0.1 0.01 0.001",
                "defaultDatetimeSpacing": "1000Y 500Y 200Y 100Y 50Y 20Y 10Y 5Y 2Y 1Y 6M 3M 2M 1M 7D 3D 2D 1D 12H 6H 3H 2H 1H",
                "function": undefined,
                "densityfactor": undefined
            },
            "grid": {
                "color": function () { return new RGBColor.parse("0xeeeeee"); },
                "visible": false
            },
            "pan": {
                "allowed": true,
                "min": null,
                "max": null
            },
            "zoom": {
                "allowed": true,
                "min": undefined,
                "max": undefined,
                "anchor": null
            },
            "binding": {
                "id": undefined,
                "min": undefined,
                "max": undefined
            },
            "id": undefined,
            "type": "number",
            //                "length": 1.0,
            "length" : function () { return new Displacement(1,0); },
            "position": function () { return new Point(0,0); },
            "pregap": 0,
            "postgap": 0,
            "anchor": -1,
            "base": function () { return new Point(-1,-1); },
            "min": "auto",
            "minoffset": 0,
            //"minposition": -1,
            "minposition": function () { return new Displacement(-1,0); },
            "max": "auto",
            "maxoffset": 0,
            //"maxposition": 1,
            "maxposition": function () { return new Displacement(1,0); },
            "positionbase": undefined,
            //                "color": "0x000000",
            "color": function () { return new RGBColor(0,0,0); },
            "tickmin": -3,
            "tickmax": 3,
            "tickcolor": null,
            "highlightstyle": "axis",
            "linewidth": 1,
            "orientation": undefined
        },
        "verticalaxis": {
            "title": {
                "content": undefined,
                //                    "fontname": "default",
                //                    "fontsize": "12",
                //                    "fontcolor": "0x000000",
                "anchor": function () { return new Point(0,-20); },
                "position": function () { return new Point(0,1); },
                "angle": "0"
            },
            "labels": {
                "label": {
                    "format": undefined,
                    "start": undefined,
                    "angle": undefined,
                    "position": undefined,
                    "anchor": undefined,
                    "spacing": undefined,
                    "densityfactor": undefined
                    //                        "fontname": undefined,
                    //                        "fontsize": undefined,
                    //                        "fontcolor": undefined
                },
                //                    "fontname": "default",
                //                    "fontsize": "12",
                //                    "fontcolor": "0x000000",
                "format": "%1d",
                "visible": "true",
                "start": "0",
                "angle": "0.0",
                "position": "0 0",
                "anchor": "0 0",
                //                    "spacing": "10000 5000 2000 1000 500 200 100 50 20 10 5 2 1 0.1 0.01 0.001",
                //                    "defaultDatetimeSpacing": "1000Y 500Y 200Y 100Y 50Y 20Y 10Y 5Y 2Y 1Y 6M 3M 2M 1M 7D 3D 2D 1D 12H 6H 3H 2H 1H",
                "function": undefined,
                "densityfactor": undefined
            },
            "grid": {
                //                    "color": "0xeeeeee",
                "visible": "false"
            },
            "pan": {
                "allowed": "yes",
                "min": undefined,
                "max": undefined
            },
            "zoom": {
                "allowed": "yes",
                "min": undefined,
                "max": undefined,
                "anchor": "none"
            },
            "binding": {
                "id": undefined,
                "min": undefined,
                "max": undefined
            },
            "id": undefined,
            "type": "number",
            //                "length": "1.0",
            "position": "0 0",
            "pregap": "0",
            "postgap": "0",
            "anchor": "-1",
            "base": "-1 1",
            "min": "auto",
            "minoffset": "0",
            "minposition": "-1",
            "max": "auto",
            "maxoffset": "0",
            "maxposition": "1",
            "positionbase": undefined,
            //                "color": "0x000000",
            "tickmin": "-3",
            "tickmax": "3",
            "highlightstyle": "axis",
            "linewidth": "1",
            "orientation": undefined
        },
        "plot": {
            "legend": {
                "visible": true,
                "label": undefined
            },
            "horizontalaxis": {
                "variable": {
                    "ref": undefined,
                    "factor": undefined
                },
                "constant": {
                    "value": undefined
                },
                "ref": undefined
            },
            "verticalaxis": {
                "variable": {
                    "ref": undefined,
                    "factor": undefined
                },
                "constant": {
                    "value": undefined
                },
                "ref": undefined
            },
            "filter": {
                "option": {
                    "name": undefined,
                    "value": undefined
                },
                "type": undefined
            },
            "renderer":{
                "option": {
                    "name": undefined,
                    "value": undefined,
                    "min": undefined,
                    "max": undefined
                },
                "type": function () {
                    var Renderer = require('../core/renderer.js');
                    return Renderer.Type.parse("line");
                }
            },
            "datatips":{
                "variable": {
                    "format": undefined
                },
                //                    "visible": "false",
                "format": undefined,
                //                    "bgcolor": "0xeeeeee",
                "bgalpha": "1.0",
                "border": 1,
                //                    "bordercolor": "0x000000",
                "pad": 2
            }
        },
        "throttle": {
            "pattern"    : "",
            "requests"   : 0,
            "period"     : 0,
            "concurrent" : 0
        },
        "data": {
            "variables": {
                "variable": {
                    "id": undefined,
                    "column": undefined,
                    "type": "number",
                    "missingvalue": undefined,
                    "missingop": undefined
                },
                "missingvalue": "-9000",
                "missingop": "eq"
            },
            "values": {
                "content": undefined
            },
            "csv": {
                "location": undefined
            },
            "service": {
                "location": undefined
            }
        }
    };
    
};

module.exports = utilityFunctions;


},{"../core/datetime_value.js":36,"../core/number_value.js":50,"../core/renderer.js":56,"../math/displacement.js":100,"../math/insets.js":102,"../math/point.js":103,"../math/rgb_color.js":104}],133:[function(require,module,exports){
var ValidationFunctions = {};

ValidationFunctions.validateNumberRange = function (number, lowerBound, upperBound) {
    return typeof(number) === "number" && number >= lowerBound && number <= upperBound;
};

// This function, from http://javascript.crockford.com/remedial.html, should correctly
// return 'array' for any Array object, including [].
ValidationFunctions.typeOf = function(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            //NOTE: Crockford used "=="   ?????!!!!!  mbp Fri Sep 28 08:44:34 2012
            //if (Object.prototype.toString.call(value) == '[object Array]') {
            if (Object.prototype.toString.call(value) === '[object Array]') {
                s = 'array';
            }
        } else {
            s = 'null';
        }
    }
    return s;
};

module.exports = ValidationFunctions;

},{}]},{},[97])