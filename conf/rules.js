const rules = [
  {
    "key": "DomainsNumber",
    "prio": 3,
    "effort": 3,
    "impact": 4
  },
  {
    "key": "AddExpiresOrCacheControlHeaders",
    "prio": 4,
    "effort": 3,
    "impact": 4
  },
  {
    "key": "CompressHttp",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "DontResizeImageInBrowser",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "EmptySrcTag",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "ExternalizeCss",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "ExternalizeJs",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "HttpError",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "HttpRequests",
    "prio": 4,
    "effort": 3,
    "impact": 4
  },
  {
    "key": "ImageDownloadedNotDisplayed",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "JsValidate",
    "prio": 3,
    "effort": 3,
    "impact": 2
  },
  {
    "key": "MaxCookiesLength",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "MinifiedCss",
    "prio": 4,
    "effort": 3,
    "impact": 4
  },
  {
    "key": "MinifiedJs",
    "prio": 4,
    "effort": 3,
    "impact": 4
  },
  {
    "key": "NoCookieForStaticRessources",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "NoRedirect",
    "prio": 3,
    "effort": 3,
    "impact": 3
  },
  {
    "key": "OptimizeBitmapImages",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "OptimizeSvg",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "Plugins",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "PrintStyleSheet",
    "prio": 3,
    "effort": 4,
    "impact": 3
  },
  {
    "key": "SocialNetworkButton",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "StyleSheets",
    "prio": 4,
    "effort": 4,
    "impact": 4
  },
  {
    "key": "UseETags",
    "prio": 9,
    "effort": 9,
    "impact": 9
  },
  {
    "key": "UseStandardTypefaces",
    "prio": 4,
    "effort": 3,
    "impact": 4
  }
]

module.exports = rules;