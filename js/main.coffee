class @SearchCacheManager
  initialize: ->
    if typeof(Storage)
      @support = true
    else
      @support = false

  get: (key) ->
    obj = localStorage.getItem(key)
    if obj
      return JSON.parse(obj)
    return null

  set: (key, value) ->
    localStorage.setItem(key,  JSON.stringify({value: value, timestamp: new Date().getTime()}))


class @SearchAppClass extends Backbone.View
  tagName: 'div'
  APIKey: "AIzaSyA8Wwqr7E_kGiuMgjg4LPCYsr_xLbAKW30"
  cx: "001263338927699927252:0uq6_e-3l-m"
  pageSize: 10

  initialize: ->
    @cache = new window.SearchCacheManager()
    @loading = false
    @annotations = {}
    @keyword = ""
    @page = 1
    @response = null
    @results_tpl = _.template($("#search-results-list-template").html())
    @error_tpl = _.template($("#search-error-template").html())
    @render()

  events:
    "click a.search-button":       "searchButtonClicked"
    "click li.page-number":        "searchPageClicked"
    "submit form.search-bar-form": "searchFormSubmit"
    "click a.nocache-reload":      "searchNoCache"

  searchButtonClicked: (e) =>
    e.preventDefault()
    e.stopPropagation()
    keyword = $(e.target).parent("form").find(".searchbox")[0].value
    window.SearchAppRouter.navigate("search/" + keyword, trigger: true)

  searchFormSubmit: (e) =>
    e.preventDefault()
    e.stopPropagation()
    keyword = $(e.target).find(".searchbox")[0].value
    window.SearchAppRouter.navigate("search/" + keyword, trigger: true)

  searchNoCache: (e) =>
    e.preventDefault()
    e.stopPropagation()
    @annotations.search_options.push "no_cache"
    window.SearchAppRouter.navigate("search/" + @keyword + "/p" + @page + "/" + @annotations.search_options.join("+"), trigger: true) 

  searchPageClicked: (e) =>
    e.preventDefault()
    e.stopPropagation()
    page = parseInt($(e.target).text())
    window.SearchAppRouter.navigate("search/" + @keyword + "/p" + page + "/" + @annotations.search_options.join("+"), trigger: true)

  constructEndpoint: (keyword, page) =>
    url = "https://www.googleapis.com/customsearch/v1?key=" + @APIKey
    url += "&cx=" + @cx
    url += "&q=" + encodeURIComponent(keyword)
    url += "&start=" + ((page - 1) * @pageSize + 1)
    url += "&num=" + @pageSize
    return url

  constructCacheKey: (keyword, page) =>
    return keyword + " P" + page

  search: (@keyword, @page, @search_options) =>
    console.log "Searching '" + keyword + "' for page " + @page + " with options " + @search_options.join("+")

    @annotations = from_cache: false
    @annotations.keyword = keyword
    @annotations.page = page
    @annotations.search_options = @search_options

    cacheKey = @constructCacheKey(keyword, page)

    if ! _.contains(@search_options, "no_cache")
      obj = @cache.get(cacheKey)
      if obj
        console.log "Found cached results for key '" + cacheKey + "'"
        @annotations.from_cache = true
        @annotations.cache_timestamp = obj.timestamp
        date = new Date(obj.timestamp)
        @annotations.cache_timestamp_iso = date.toISOString()
        @annotations.cache_timestamp_readable = date.toString('MMM d, yyyy')
        return @parseResults(obj.value)

    @annotations.cacheKeyToWrite = cacheKey

    endpoint = @constructEndpoint(keyword, page)
    console.log "API URL: " + endpoint

    @annotations.from_remote = true
    $.ajax(
      url: endpoint,
      context: this
      beforeSend: ->
        @loading = true
      complete: ->
    ).success (data) ->
      @parseResults(data)
    .error (jqXHR, textStatus, errorThrown) ->
      @annotations.http_error = textStatus
      @parseResults(errorThrown)

    @render()

  parseResults: (@response_text) =>
    @loading = false
    if $.isPlainObject(@response_text)
      @response = @response_text
    else if $.type(@response_text) == "string"
      try
        @response = $.parseJSON(@response_text)
        if @response == null
          @response = {}
      catch e
        @response = {}
        console.log e
        console.log @response_text
    else
      @response = {}

    if @annotations.http_error
      if @response.error
        @annotations.error_message = @response.errors.errors[0].message
      else
        @annotations.error_message = @annotations.http_error

    else
      if @annotations.cacheKeyToWrite
        @cache.set @annotations.cacheKeyToWrite, JSON.stringify(@response)
        console.log "Writing to cache key '" + @annotations.cacheKeyToWrite + "'"
      else
        console.log "cacheKeyToWrite not provided."

    @render()

  render: =>
    @$el.empty()
    @$el.append($("#search-bar-template").html())

    if @loading
      spinner = $('<div style="min-height:200px"></div>')
      @$el.append spinner
      spinner.spin("large", "black")

    if @annotations.error_message
      @$el.append @error_tpl(@annotations)
    if @response
      @$el.append @results_tpl(_.extend @response, annotations: @annotations)

      for page_el in @$el.find(".page-number")
        if page_el.innerText == @annotations.page.toString()
          $(page_el).find('a').addClass "current-page"

    $("abbr.timeago").timeago()
    $('.searchbox').val(@keyword)

class @SearchAppRouterClass extends Backbone.Router
  routes:
    "search/:query":                  "redirectSearch"
    "search/:query/p:page":           "search"
    "search/:query/p:page/":          "search"
    "search/:query/p:page/:options":  "search"

  redirectSearch: (query) =>
    @navigate "search/" + query + "/p1", trigger: true

  search: (query, page, options) =>
    if options
      options = options.split("+")
    else
      options = []
    window.SearchApp.search(query, parseInt(page), options)

$ =>
  @SearchApp = new @SearchAppClass(el: $(".search-app"))
  @SearchAppRouter = new @SearchAppRouterClass()
  Backbone.history.start()
