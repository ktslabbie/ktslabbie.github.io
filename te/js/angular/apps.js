var twitterWebApp = angular.module('twitterWeb.app', 
		['twitterWeb.APIService', 'twitterWeb.WorkerServices', 'twitterWeb.EvaluationServices', 'twitterWeb.directives',
		 'twitterWeb.GraphService', 'twitterWeb.controller', 'infinite-scroll', 'ngAnimate'])
		 
.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});