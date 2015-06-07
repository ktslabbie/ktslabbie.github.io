/**
 * Web Worker for the HCS algorithm to cluster a network.
 */
importScripts('../vendor/lodash.min.js');

var alpha = 2;
var adjMatrix;
var totalNodeCount;

/**
 * Calculate the minimum spanning tree using Kruskal's algorithm.
 * 
 * @param nodes
 * @param edges
 * @returns forest The clusters.
 */
function kruskal(nodes, edges) {
	var nodeCount = nodes.length,
	    clusterCount = nodeCount,
	    i = edges.length,
	    clusterIndex = 0,
	    nodeMap = {},
	    clusterMap = {};
	
	//var degrees = _.map(nodes, function() { return 0; });
	
	while(i--) {
		if(clusterCount <= 2) break;
		
		var edge          = edges[i],
	        sourceNode    = edge[0],
            targetNode    = edge[1],
            sourceCluster = nodeMap[sourceNode],
            targetCluster = nodeMap[targetNode];
		
			//degrees[sourceNode]++;
			//degrees[targetNode]++;
			
		if(sourceCluster === undefined && targetCluster === undefined) {
			nodeMap[sourceNode] = clusterIndex;
			nodeMap[targetNode] = clusterIndex;
			
			clusterMap[clusterIndex] = [sourceNode, targetNode];
			clusterIndex++;
			clusterCount--;
			nodeCount -= 2;
			
		} else if(sourceCluster === undefined) {
			nodeMap[sourceNode] = targetCluster;
			clusterMap[targetCluster].push(sourceNode);
			clusterCount--;
			nodeCount--;
			
		} else if(targetCluster === undefined) {
			nodeMap[targetNode] = sourceCluster;
			clusterMap[sourceCluster].push(targetNode);
			clusterCount--;
			nodeCount--;
			
		} else {
			if(sourceCluster != targetCluster) {
				var sourceNodes = clusterMap[sourceCluster],
				    targetNodes = clusterMap[targetCluster];
				
				if(sourceNodes.length > targetNodes.length) {
					clusterMap[sourceCluster] = _.union(sourceNodes, targetNodes);
					_.each(targetNodes, function(node) { nodeMap[node] = sourceCluster; });
					delete clusterMap[targetCluster];
				} else {
					clusterMap[targetCluster] = _.union(sourceNodes, targetNodes);
					_.each(sourceNodes, function(node) { nodeMap[node] = targetCluster; });
					delete clusterMap[sourceCluster];
				}
				
				clusterCount--;
			}
		}
		
		/*else {
			if(sourceCluster == targetCluster) {
				degrees[sourceNode]++;
				degrees[targetNode]++;
			}
		}*/
	}
	
	return { clusters: _.values(clusterMap) };
	
	// Nicer but much slower version.
	/*var forest = _.map(nodes, function(node) { return [node]; });
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
    
    return forest;*/
}

/**
 * Recursive function to apply the HCS algorithm, given the current graph as input.
 * 
 * @param nodes
 * @param edges
 */
function hcs(nodes, edges, zoomed) {
	
	// A graph with one or two nodes is ignored.
	//if(edges.length <= 1) return;
	
	// Get the clusters by calculating the minimum spanning tree (Kruskal).
	var clusterObj = kruskal(nodes, edges);
	//var degrees = clusterObj.degrees;
	
	// Split clusters into subgraphs.
	_.each(clusterObj.clusters, function(cluster, i) {
		var clusterSize = cluster.length;
		var clusterEdges = [];
		
		// Drop clusters too small from the result (set them to the 0 group).
		if((zoomed && clusterSize <= 1) || (!zoomed && clusterSize <= 2)) {
			// Find the edges within the cluster, as well as the degrees of the edges.
			_.each(edges, function(edge) {

				var s = _.indexOf(cluster, edge[0]);
				var t = _.indexOf(cluster, edge[1]);

				if(s >= 0 || t >= 0) {
					clusterEdges.push(edge);
				}
			});

			
			self.postMessage( { finished: false, nodes: cluster, edges: clusterEdges, drop: true } );
			return;
		}

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
		//_.each(cluster.nodes, function(node) { if(degrees[node] < minDegree) minDegree = degrees[node]; });
		
		console.log("# of edges: " + clusterEdges.length + ", # of nodes: " + clusterSize + ", min. degree: " + minDegree);
		
		// Check for highly-connectedness. If so, we're done with this cluster, else call this function again with the subgraph.
		if( (zoomed && minDegree >= clusterSize/2) || (!zoomed && minDegree > clusterSize/alpha) )
			self.postMessage( { finished: false, nodes: cluster, edges: clusterEdges, drop: false, } );
		else
			hcs(cluster, clusterEdges, zoomed);
	});
}

self.addEventListener('message', function(e) {
	// Update alpha.
	alpha = e.data.alpha;
	
	totalNodeCount = e.data.nodeCount;
	
	// Generate the adjacency matrix and nodes.
	//adjMatrix = _.times(totalNodeCount, function(n) { return Array.apply(null, new Array(totalNodeCount + 1)).map(Number.prototype.valueOf, 0); });
	var nodes = _.range(totalNodeCount);
	//var degrees = Array.apply(null, new Array(totalNodeCount)).map(Number.prototype.valueOf, 0);
	
	// Sort the edges by similarity score and fill in the matrix.
	var sortedEdges = _.sortBy(e.data.links, function(ln) {
		//adjMatrix[ln[0]][ln[1]] = ln[2];
		//degrees[ln[0]] += 1;
		//degrees[ln[1]] += 1;
		return ln[2];
	});
	
	// First iteration. Input is the full network.
	hcs(nodes, sortedEdges, e.data.zoomed);
	
	// We're done. Return this fact.
	self.postMessage( { finished: true } );
}, false);
