var workerService = angular.module('twitterWeb.WorkerServices', [])

.factory("CFIUFService", ['$q',  function($q) {

	var worker = new Worker("js/workers/cf-iuf_worker.js");
	var defer = $q.defer();

	worker.addEventListener('message', function(e) {
		defer.resolve(e.data);
	});
	
	return {
        doWork: function(event) {
        	defer = $q.defer();
        	
        	worker.postMessage(event);
        	
        	return defer.promise;
        },
        
        clear: function() {
            worker.postMessage({ clear: true }); // Tell our worker we want to clear its data.
        }
    };
}])

.factory("CFIUFGroupService", ['$q',  function($q) {

	var worker = new Worker("js/workers/cf-iuf_worker.js");
	var defer = $q.defer();

	worker.addEventListener('message', function(e) {
		defer.resolve(e.data);
	});
	
	return {
        doWork: function(event) {
            defer = $q.defer();
            worker.postMessage(event);
            return defer.promise;
        },
        
        clear: function() {
            worker.postMessage({ clear: true }); // Tell our worker we want to clear its data.
        }
    };
}])

.factory("SimilarityService", ['$rootScope', '$q',  function($rootScope, $q) {

	var workers = [];
	var workerCount = 6;
	var defer;
	var resolvedCount;
	
	function createWorkers() {
		
		defer = $q.defer();
		resolvedCount = workerCount;
		var cnt = workerCount;
		
		while(cnt--) {
			var worker = new Worker("js/workers/similarity_worker.js");
			
			worker.addEventListener('message', function(e) {
				if(e.data.finished) {
					resolvedCount--;
					if(resolvedCount <= 0) defer.resolve(e.data);
				} else $rootScope.$broadcast('simGraphUpdate', e.data);
			}, false);
			
			workers[cnt] = worker;
		}
	}

	createWorkers();
	
	return {
        doWork: function(ev) {
            defer = $q.defer();
            
            
            if(ev.userCount >= 100) {
            	resolvedCount = workerCount;
            	var currentIndex = 0;
            	var parts = Math.round(ev.userCount / workerCount)
            	
            	for(var i = 0; i < workerCount-1; i++) {
            		ev.start = currentIndex;
            		currentIndex += parts;
            		ev.end = currentIndex;
            		workers[i].postMessage(ev);
            	}
            	
            	ev.start = currentIndex;
            	ev.end = ev.userCount-1;
            	workers[workerCount-1].postMessage(ev);
            	
            } else {
            	resolvedCount = 1;
            	ev.start = 0;
            	ev.end = ev.userCount-1;
            	workers[0].postMessage(ev);
            }
            
            return defer.promise;
        },
        
        restart: function() {
        	console.log("Terminate simworkers.");
        	for(var i = 0; i < workerCount; i++) {
        		workers[i].terminate();
        	}
        	console.log("Terminated?");
        	createWorkers();
        }
    };
}])

.factory("HCSService", ['$rootScope', '$q',  function($rootScope, $q) {

	var worker;
	var defer;
	
	function createWorker() {
		worker = new Worker("js/workers/hcs_kruskal_worker.js");
		defer = $q.defer();
		
		worker.addEventListener('message', function(e) {
			if(e.data.finished)
				defer.resolve(e.data);
			else
				$rootScope.$broadcast('hcsUpdate', e.data);
		}, false);
	}

	createWorker();
	
	return {
        doWork : function(ev){
            defer = $q.defer();
            worker.postMessage(ev);
            return defer.promise;
        },
        
        restart: function() {
        	worker.terminate();
        	createWorker();
        }
    };
}]);