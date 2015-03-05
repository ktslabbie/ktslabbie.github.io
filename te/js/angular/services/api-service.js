var twitterAPIService = angular.module('twitterWeb.APIService', ['ngResource']);
var apiHostName = "http://ec2-54-65-213-114.ap-northeast-1.compute.amazonaws.com:8090/api/"

twitterAPIService.factory('SimpleUser', ['$resource', function($resource) {
	return $resource(apiHostName + 'get-simple-user', { }, {
						get: { isArray: false, method: 'get'}
	});
}]);

twitterAPIService.factory('User', ['$resource', function($resource) {
	return $resource(apiHostName + 'get-user', { }, {
						get: { isArray: false, method: 'get'}
	});
}]);

twitterAPIService.factory('FollowersList', ['$resource', function($resource) {
	return $resource(apiHostName + 'get-followers-list', { }, {
						list: { isArray: true, method: 'get'}
	});
}]);

twitterAPIService.factory('KeywordUserList', ['$resource', function($resource) {
	return $resource(apiHostName + 'get-keyword-user-list', { }, {
						list: { isArray: true, method: 'get'}
	});
}]);