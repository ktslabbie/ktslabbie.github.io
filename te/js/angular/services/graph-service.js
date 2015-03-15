var graphService = angular.module('twitterWeb.GraphService', []);

graphService.factory('Graph', ['$rootScope', function($rootScope) {	
	
	/**
	 * Constructor for a graph.
	 * 
	 * @param width
	 * @param height
	 * @param id The HTML id tag
	 */
	function Graph(width, height, id, colors) {
		
		var that = this;
		
		var color = colors;
		var fullNodes = [];
		var fullLinks = [];
		var nodes = []; 					// Ex. [ { name: somename, group: 0, userIndex: 0, index: 0 } ]
		var links = []; 					// Ex. [ { source: nodeAName, target: nodeBName, value: 0.00 } ]
		var zoomed = false;
		
		var force = d3.layout.force()
			.nodes(nodes)
			.links(links)
			.charge(-180)
			.chargeDistance(300)
			.linkStrength(0.3)
			.friction(0.8)
			.linkDistance(60)
			.gravity(0.2)
			.size([width, height])
			.on("tick", tick);

		var svg = d3.select(id).append("svg")
			.attr("width", width)
			.attr("height", height);
	
		var node = svg.selectAll(".node");
		var link = svg.selectAll(".link");
		var text = svg.selectAll(".node-text");
		
		this.getColors = function() { return color; }
		this.getNodes = function() { return nodes; }
		this.getLinks = function() { return links; }
		this.getForce = function() { return force; }
		this.isZoomed = function() { return zoomed; }
		this.setZoomed = function(b) { zoomed = b; }
		
		/**
		 *  Clone the nodes and links, so we can restore the graph to its original form.
		 */
		this.cloneGraph = function() {
			fullNodes = _.cloneDeep(nodes);
			fullLinks = _.cloneDeep(links);
		}
		
		/**
		 * Restore the graph to its former glory.
		 */
		this.restoreGraph = function() {
			that.clearGraph();
			var newNodes = _.cloneDeep(fullNodes);
			var newLinks = _.cloneDeep(fullLinks);
			zoomed = false;
			
			_.each(newNodes, function(node) {
				that.addNode(node);
			});
			
			_.each(newLinks, function(link) {
				that.addLink(link.source.index, link.target.index, link.value);
			});
		}
		
		/**
		 * Zoom into the graph by clustering the double-clicked cluster (group).
		 */
		this.zoom = function(group) {
			that.clearLinks();
			
			var i = nodes.length;
			while(i--) {
				var nd = nodes[i];
				if(nd.group != group) nodes.splice(i, 1);
				else nodes[i].group = 0;
			}
			
			that.start(true);
			
			$rootScope.$broadcast('graphZoom', {
				  group: group,
			});
			
			zoomed = true;
		}
		
		/**
		 * Add a node to the graph.
		 */
		this.addNode = function(pNode) {
			nodes.push(pNode);
		}
		
		/** 
		 * Adds a link to the graph.
		 */
		this.addLink = function(sourceIndex, targetIndex, value) {
			links.push({ source: sourceIndex, target: targetIndex, value: value });
		}
		
		/** 
		 * Adds a link to the graph, or updates it if it already exists.
		 */
		this.addOrUpdateLink = function(sourceIndex, targetIndex, value) {
			var ln = _.find(links, function(l) { return (l.source === sourceIndex && l.target === targetIndex) || (l.source === targetIndex && l.target === sourceIndex) });
			
			if(!ln) {
				ln = { source: sourceIndex, target: targetIndex, value: value };
				links.push(ln);
			} else ln.value = value;
		}

		/** 
		 * Set a node to a group given the index of the node.
		 */
		this.setGroup = function(index, group) {
			nodes[index].group = group;
		}
		
		/**
		 * Replace the entire graph of nodes and links.
		 */
		this.initializeGraph = function(nodeCnt, pLinks, users) {
			
			for(var i = nodes.length; i < nodeCnt; i++) {
				that.addNode({ name: users[i].screenName, group: 0 });
			}
			
			that.clearLinks();
			
			/*_.each(pLinks, function(ln) {
				that.addLink(ln[0], ln[1], ln[2]);
			});*/
		}
		
		/**
		 * Replace the entire graph of nodes and links.
		 */
		this.updateGraph = function(pNodes, pLinks, group, users) {
			_.each(pNodes, function(nodeIndex) {
				nodes[nodeIndex].group = group;
			});
			
			_.each(pLinks, function(ln) {
				that.addLink(ln[0], ln[1], ln[2]);
			});
		}

		/** 
		 * Removes a node given an index.
		 */
		this.removeNode = function(index) {
			nodes.splice(index, 1);
		}
		
		/** 
		 * Removes a link given source and target index.
		 */
		this.removeLink = function(sourceIndex, targetIndex) {
			var ln = _.find(links, function(l) { return (l.source.index === sourceIndex && l.target.index === targetIndex) || 
															(l.source.index === targetIndex && l.target.index === sourceIndex) });
			if(ln) links.splice(ln.index, 1);
		}
		
		/** 
		 * Removes all links belonging to a certain group and set this group to 0.
		 */
		this.removeNodesByGroup = function(group) {
			for(var i = nodes.length-1; i >= 0; i--) {
				if(nodes[i].group === group) {
					//hat.removeNodeLinks(i);
					nodes.splice(i, 1);
					//nodes[i].group = 0;
				}
			}
		}
		
		/** 
		 * Removes all links belonging to a certain group and set this group to 0.
		 */
		this.removeLinksByGroup = function(group) {
			for(var i = nodes.length-1; i >= 0; i--) {
				if(nodes[i].group === group) {
					that.removeNodeLinks(i);
					//nodes.splice(i, 1);
					//nodes[i].group = 0;
				}
			}
		}
		
		/** 
		 * Removes all links connected to a certain node.
		 */
		this.removeNodeLinks = function(nodeIndex) {
			var i = links.length;
			while(i--) {
				var l = links[i];
				if(l.source.index === nodeIndex || l.target.index === nodeIndex) links.splice(i, 1);
			}
		}
		
		/** 
		 * Removes all nodes and links from the graph.
		 */
		this.clearNodes = function() {
			while(nodes.length > 0) nodes.pop();
		}
		
		/** 
		 * Removes all nodes and links from the graph.
		 */
		this.clearLinks = function() {
			while(links.length > 0) links.pop();
		}
		
		/** 
		 * Set all groups to zero (and thereby hiding all nodes).
		 */
		this.clearGroups = function() {
			var i = nodes.length;
			while(i--) { nodes[i].group = 0; }
		}
		
		/** 
		 * Removes all nodes and links from the graph.
		 */
		this.clearGraph = function() {
			that.clearLinks();
			that.clearNodes();
		}
		
		this.start = function(singleNodesVisible) {
			
			//text = svg.selectAll(".node-text");
			text = text.data(force.nodes());
			text.enter().append("text");
			text.exit().remove();
			text.attr("x", 9);
			text.attr("y", ".31em");
			text.attr("style", "font-weight: 300; font-size: 14px;");
			text.attr('opacity', function(d) { return d.group === 0 ? 0.15 : 0.75 });
			//text.text(function(d) { return "@" + d.name; });
			text.text(function(d) { return d.group === 0 ? singleNodesVisible ? "@" + d.name : "" : "@" + d.name; });
			
			node = svg.selectAll(".node");
			node = node.data(force.nodes(), function(d) {  return d.name; } );
			node.enter().append("circle").attr("class", function(d) { return "node " + d.name; }).attr("r", 9)
			node.exit().remove();
			node.attr('opacity', function(d) { return d.group === 0 ? 0.15 : 1 });
			node.style("visibility", function(d) { return d.group === 0 ? singleNodesVisible ? "visible" : "hidden" : "visible"; });
			node.style("fill", function(d) { return d.group === 0 ? "#333333" : color[d.group-1]; });
			node.call(force.drag);
			node.on("dblclick", function(d) { that.zoom(d.group); });
			
			link = svg.selectAll(".link");
			link = link.data(force.links(), function(d) {  return d.value; });
			link.enter().insert("line", ".node").attr("class", "link");
			link.exit().remove();
			//link.style("stroke-width", function(d) { var width = (Math.pow(d.value*3, 2)); return (width < 0.5) ? 0.5 : (width > 3) ? 3 : width; });

			
			
			force.start();
		}
		
		function tick() {
			node.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; })

			/*if(zoomed) { 
				link.attr("x1", function(d) { return d.source.x; })
					.attr("y1", function(d) { return d.source.y; })
					.attr("x2", function(d) { return d.target.x; })
					.attr("y2", function(d) { return d.target.y; });
			}*/

			text.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
		}
	}
	
	/**
   * Return the constructor function
   */
	return Graph;
}]);