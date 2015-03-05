/**
 * Web Worker for the HCS algorithm to cluster a network.
 */
importScripts('../vendor/lodash.min.js');

/**
 * Calculate the minimum spanning tree using Kruskal's algorithm.
 * 
 * @param nodes
 * @param edges
 * @returns forest The clusters.
 */
function kruskal(nodes, edges) {
    var forest = _.map(nodes, function(node) { return [node]; });
    var i = edges.length;
    
    while(i--) {
    	if(forest.length <= 2) break;
    	var edge = edges[i];
        var t1 = _.find(forest, function(tree) { return _.includes(tree, edge[0]); });
        var t2 = _.find(forest, function(tree) { return _.includes(tree, edge[1]); });
        
        if (!_.isEqual(t1, t2)) {
            forest = _.without(forest, t1, t2);
            forest.push(_.union(t1, t2));
        }
    }
    
    return forest;
}

/**
 * Recursive function to apply the HCS algorithm, given the current graph as input.
 * 
 * @param nodes
 * @param edges
 */
function hcs(nodes, edges) {
	
	// A graph with one or two nodes is ignored.
	//if(edges.length <= 1) return;
	
	// Get the clusters by calculating the minimum spanning tree (Kruskal).
	var clusters = kruskal(nodes, edges);
	
	// Split clusters into subgraphs.
	_.each(clusters, function(cluster, i) {
		var clusterSize = cluster.length;
		
		// Drop clusters too small from the result.
		if(clusterSize <= 2) {
			self.postMessage( { finished: false, nodes: cluster } );
			return;
		}
		var clusterEdges = [];
		var degrees = _.map(cluster, function() { return 0; });
		
		// Find the edges within the cluster, as well as the degrees of the edges.
		_.each(edges, function(edge) {
			var s = _.indexOf(cluster, edge[0]);
			if(s >= 0) {
				var t = _.indexOf(cluster, edge[1]);
				if(t >= 0) {
					clusterEdges.push(edge);
					degrees[s]++;
					degrees[t]++;
				}
			}
		});
		
		// Calculate the minimum degree.
		var minDegree = _.min(degrees);
		console.log("# of edges: " + clusterEdges.length + ", # of nodes: " + clusterSize + ", min. degree: " + minDegree);
		
		// Check for highly-connectedness. If so, we're done with this cluster, else call this function again with the subgraph.
		if(minDegree > clusterSize/2)
			self.postMessage( { finished: false, nodes: cluster, edges: clusterEdges } );
		else
			hcs(cluster, clusterEdges);
	});
}

self.addEventListener('message', function(e) {	
	// Generate the nodes.
	var nodes = _.range(e.data.nodeCount);
	// Sort the edges by similarity score.
	var sortedEdges = _.sortBy(e.data.links, function(ln) { return ln[2]; });
	
	// First iteration. Input is the full network.
	hcs(nodes, sortedEdges);
	
	// We're done. Return this fact.
	self.postMessage( { finished: true } );
}, false);