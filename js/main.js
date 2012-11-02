// Generated by CoffeeScript 1.3.3
(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    _this = this;

  this.SearchCacheManager = (function() {

    function SearchCacheManager() {}

    SearchCacheManager.prototype.initialize = function() {
      if (typeof Storage) {
        return this.support = true;
      } else {
        return this.support = false;
      }
    };

    SearchCacheManager.prototype.get = function(key) {
      var obj;
      obj = localStorage.getItem(key);
      if (obj) {
        return JSON.parse(obj);
      }
      return null;
    };

    SearchCacheManager.prototype.set = function(key, value) {
      return localStorage.setItem(key, JSON.stringify({
        value: value,
        timestamp: new Date().getTime()
      }));
    };

    return SearchCacheManager;

  })();

  this.SearchAppClass = (function(_super) {

    __extends(SearchAppClass, _super);

    function SearchAppClass() {
      this.render = __bind(this.render, this);

      this.parseResults = __bind(this.parseResults, this);

      this.search = __bind(this.search, this);

      this.constructCacheKey = __bind(this.constructCacheKey, this);

      this.constructEndpoint = __bind(this.constructEndpoint, this);

      this.searchPageClicked = __bind(this.searchPageClicked, this);

      this.searchNoCache = __bind(this.searchNoCache, this);

      this.searchFormSubmit = __bind(this.searchFormSubmit, this);

      this.searchButtonClicked = __bind(this.searchButtonClicked, this);
      return SearchAppClass.__super__.constructor.apply(this, arguments);
    }

    SearchAppClass.prototype.tagName = 'div';

    SearchAppClass.prototype.APIKey = "AIzaSyA8Wwqr7E_kGiuMgjg4LPCYsr_xLbAKW30";

    SearchAppClass.prototype.cx = "001263338927699927252:0uq6_e-3l-m";

    SearchAppClass.prototype.pageSize = 10;

    SearchAppClass.prototype.initialize = function() {
      this.cache = new window.SearchCacheManager();
      this.loading = false;
      this.annotations = {};
      this.keyword = "";
      this.page = 1;
      this.response = null;
      this.results_tpl = _.template($("#search-results-list-template").html());
      this.error_tpl = _.template($("#search-error-template").html());
      return this.render();
    };

    SearchAppClass.prototype.events = {
      "click a.search-button": "searchButtonClicked",
      "click li.page-number": "searchPageClicked",
      "submit form.search-bar-form": "searchFormSubmit",
      "click a.nocache-reload": "searchNoCache"
    };

    SearchAppClass.prototype.searchButtonClicked = function(e) {
      var keyword;
      e.preventDefault();
      e.stopPropagation();
      keyword = $(e.target).parent("form").find(".searchbox")[0].value;
      return window.SearchAppRouter.navigate("search/" + keyword, {
        trigger: true
      });
    };

    SearchAppClass.prototype.searchFormSubmit = function(e) {
      var keyword;
      e.preventDefault();
      e.stopPropagation();
      keyword = $(e.target).find(".searchbox")[0].value;
      return window.SearchAppRouter.navigate("search/" + keyword, {
        trigger: true
      });
    };

    SearchAppClass.prototype.searchNoCache = function(e) {
      e.preventDefault();
      e.stopPropagation();
      this.annotations.search_options.push("no_cache");
      return window.SearchAppRouter.navigate("search/" + this.keyword + "/p" + this.page + "/" + this.annotations.search_options.join("+"), {
        trigger: true
      });
    };

    SearchAppClass.prototype.searchPageClicked = function(e) {
      var page;
      e.preventDefault();
      e.stopPropagation();
      page = parseInt($(e.target).text());
      return window.SearchAppRouter.navigate("search/" + this.keyword + "/p" + page + "/" + this.annotations.search_options.join("+"), {
        trigger: true
      });
    };

    SearchAppClass.prototype.constructEndpoint = function(keyword, page) {
      var url;
      url = "https://www.googleapis.com/customsearch/v1?key=" + this.APIKey;
      url += "&cx=" + this.cx;
      url += "&q=" + encodeURIComponent(keyword);
      url += "&start=" + ((page - 1) * this.pageSize + 1);
      url += "&num=" + this.pageSize;
      return url;
    };

    SearchAppClass.prototype.constructCacheKey = function(keyword, page) {
      return keyword + " P" + page;
    };

    SearchAppClass.prototype.search = function(keyword, page, search_options) {
      var cacheKey, date, endpoint, obj;
      this.keyword = keyword;
      this.page = page;
      this.search_options = search_options;
      console.log("Searching '" + keyword + "' for page " + this.page + " with options " + this.search_options.join("+"));
      this.annotations = {
        from_cache: false
      };
      this.annotations.keyword = keyword;
      this.annotations.page = page;
      this.annotations.search_options = this.search_options;
      cacheKey = this.constructCacheKey(keyword, page);
      if (!_.contains(this.search_options, "no_cache")) {
        obj = this.cache.get(cacheKey);
        if (obj) {
          console.log("Found cached results for key '" + cacheKey + "'");
          this.annotations.from_cache = true;
          this.annotations.cache_timestamp = obj.timestamp;
          date = new Date(obj.timestamp);
          this.annotations.cache_timestamp_iso = date.toISOString();
          this.annotations.cache_timestamp_readable = date.toString('MMM d, yyyy');
          return this.parseResults(obj.value);
        }
      }
      this.annotations.cacheKeyToWrite = cacheKey;
      endpoint = this.constructEndpoint(keyword, page);
      console.log("API URL: " + endpoint);
      this.annotations.from_remote = true;
      $.ajax({
        url: endpoint,
        context: this,
        beforeSend: function() {
          return this.loading = true;
        },
        complete: function() {}
      }).success(function(data) {
        return this.parseResults(data);
      }).error(function(jqXHR, textStatus, errorThrown) {
        this.annotations.http_error = textStatus;
        return this.parseResults(errorThrown);
      });
      return this.render();
    };

    SearchAppClass.prototype.parseResults = function(response_text) {
      this.response_text = response_text;
      this.loading = false;
      if ($.isPlainObject(this.response_text)) {
        this.response = this.response_text;
      } else if ($.type(this.response_text) === "string") {
        try {
          this.response = $.parseJSON(this.response_text);
          if (this.response === null) {
            this.response = {};
          }
        } catch (e) {
          this.response = {};
          console.log(e);
          console.log(this.response_text);
        }
      } else {
        this.response = {};
      }
      if (this.annotations.http_error) {
        if (this.response.error) {
          this.annotations.error_message = this.response.errors.errors[0].message;
        } else {
          this.annotations.error_message = this.annotations.http_error;
        }
      } else {
        if (this.annotations.cacheKeyToWrite) {
          this.cache.set(this.annotations.cacheKeyToWrite, JSON.stringify(this.response));
          console.log("Writing to cache key '" + this.annotations.cacheKeyToWrite + "'");
        } else {
          console.log("cacheKeyToWrite not provided.");
        }
      }
      return this.render();
    };

    SearchAppClass.prototype.render = function() {
      var page_el, spinner, _i, _len, _ref;
      this.$el.empty();
      this.$el.append($("#search-bar-template").html());
      if (this.loading) {
        spinner = $('<div style="min-height:200px"></div>');
        this.$el.append(spinner);
        spinner.spin("large", "black");
      }
      if (this.annotations.error_message) {
        this.$el.append(this.error_tpl(this.annotations));
      }
      if (this.response) {
        this.$el.append(this.results_tpl(_.extend(this.response, {
          annotations: this.annotations
        })));
        _ref = this.$el.find(".page-number");
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          page_el = _ref[_i];
          if (page_el.innerText === this.annotations.page.toString()) {
            $(page_el).find('a').addClass("current-page");
          }
        }
      }
      $("abbr.timeago").timeago();
      return $('.searchbox').val(this.keyword);
    };

    return SearchAppClass;

  })(Backbone.View);

  this.SearchAppRouterClass = (function(_super) {

    __extends(SearchAppRouterClass, _super);

    function SearchAppRouterClass() {
      this.search = __bind(this.search, this);

      this.redirectSearch = __bind(this.redirectSearch, this);
      return SearchAppRouterClass.__super__.constructor.apply(this, arguments);
    }

    SearchAppRouterClass.prototype.routes = {
      "search/:query": "redirectSearch",
      "search/:query/p:page": "search",
      "search/:query/p:page/:options": "search"
    };

    SearchAppRouterClass.prototype.redirectSearch = function(query) {
      return this.navigate("search/" + query + "/p1", {
        trigger: true
      });
    };

    SearchAppRouterClass.prototype.search = function(query, page, options) {
      if (options) {
        options = options.split("+");
      } else {
        options = [];
      }
      return window.SearchApp.search(query, parseInt(page), options);
    };

    return SearchAppRouterClass;

  })(Backbone.Router);

  $(function() {
    _this.SearchApp = new _this.SearchAppClass({
      el: $(".search-app")
    });
    _this.SearchAppRouter = new _this.SearchAppRouterClass();
    return Backbone.history.start();
  });

}).call(this);
