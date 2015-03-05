var twitterAPIService = angular.module('twitterWeb.APIService', ['ngResource']);

twitterAPIService.factory('SimpleUser', ['$resource', function($resource) {
	return $resource('/api/get-simple-user', { }, {
						get: { isArray: false, method: 'get'}
	});
}]);

twitterAPIService.factory('User', ['$resource', function($resource) {
	return $resource('/api/get-user', { }, {
						get: { isArray: false, method: 'get'}
	});
}]);

twitterAPIService.factory('FollowersList', ['$resource', function($resource) {
	return $resource('/api/get-followers-list', { }, {
						list: { isArray: true, method: 'get'}
	});
}]);

twitterAPIService.factory('KeywordUserList', ['$resource', function($resource) {
	return $resource('/api/get-keyword-user-list', { }, {
						list: { isArray: true, method: 'get'}
	});
}]);