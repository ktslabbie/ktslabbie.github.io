/**
 * Web Worker for calculating the similarity graph of users.
 */
importScripts('../vendor/lodash.min.js');

self.addEventListener('message', function(e) {
	var ret = { finished: false };
	var N = e.data.cfiufMaps.length;
/*	
	console.log("Simgraph N: " + N);
	console.log("Start: " + e.data.start);
	console.log("End: " + e.data.end);*/
	
	// Calculate cosine similarity wrt. all previous users.
	for(var i = e.data.start; i < e.data.end; i++) {
		var prevUserMap = e.data.cfiufMaps[i];

		for(var j = i+1; j < N; j++) {
			var curUserMap = e.data.cfiufMaps[j];
			var similarity = _.reduce(prevUserMap, function(simSum, n, key) { return (curUserMap[key]) ? simSum + curUserMap[key]*n : simSum; });

			if(similarity >= e.data.minSim) {
				ret.similarity = similarity;
				ret.i = i; ret.j = j;
				self.postMessage(ret);
			}
		}
	}
	
	self.postMessage({ finished: true });
}, false);
