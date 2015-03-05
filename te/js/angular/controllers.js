var twitterWebController = angular.module('twitterWeb.controller', [])

.controller('TwitterController', ['$scope', '$timeout', 'SimpleUser', 'User', 'FollowersList', 'KeywordUserList', 'SimilarityService',
                                  'CFIUFService', 'CFIUFGroupService', 'HCSService', 'EvaluationService', 'Graph',
                                  function($scope, $timeout, SimpleUser, User, FollowersList, KeywordUserList, SimilarityService, 
                                		   CFIUFService, CFIUFGroupService, HCSService, EvaluationService, Graph) {
	
	$scope.status = { loadingInitialData: false, noUserFound: false, loadingUsers: false, updatingCFIUF: false, updatingSimilarityGraph: false, 
						clusteringNetwork: false, clusteringFinished: false, finalUpdate: false, awaitingFinalClustering: false, zoomed: false };
	
	$scope.users = [];
	$scope.validUsers = [];
	$scope.visibleUsers = [];
	var fullGroups = [];
	$scope.groups = [];
	$scope.screenName = "iOS_blog";
	$scope.keyword = "machine learning";
	$scope.pageSize = 0;
	$scope.refreshCnt = 0;
	$scope.tweetsPerUser = 200;
	$scope.userCount = 200;
	$scope.minimumEnglishRate = 0.7;
	
	// Named Entity Recognition settings.
	$scope.nerConfidence = 0;
	$scope.nerSupport = 0;
	$scope.generalityBias = 0.4;
	$scope.concatenation = 25;
	
	// Minimum similarity threshold.
	$scope.minimumSimilarity = 0.05;
	
	// Twitter user restrictions.
	$scope.maxSeedUserFollowers = 9990000;
	$scope.minFollowers = 0;
	$scope.maxFollowers = 10000;
	$scope.minFollowing = 0;
	$scope.maxFollowing = 10000;
	$scope.minTweets = 100;
	$scope.maxTweets = 1000000;
	
	$scope.processIndex = 0;
	$scope.completedCFIUFCount = 0;
	$scope.maxProcesses = 6;
	$scope.activeProcesses = 1;
	
	var graph = new Graph(1080, 540, "#graph");
	
	$scope.legend = [];
	var fullLegend = [];
	$scope.colors = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5",
	                 "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5" ];
	
	$scope.isLoading = function() {
		return $scope.status.loadingUsers || $scope.status.updatingCFIUF || $scope.status.updatingSimilarityGraph || $scope.status.clusteringNetwork;
	}
	
	/**
	 * Initialize the state of the application.
	 */
	$scope.init = function() {
		$scope.status = { loadingInitialData: false, noUserFound: false, loadingUsers: false, updatingCFIUF: false, updatingSimilarityGraph: false, 
							clusteringNetwork: false, clusteringFinished: false, finalUpdate: false, awaitingFinalClustering: false, zoomed: false };
		
		while($scope.users.length > 0) $scope.users.pop();
		while($scope.validUsers.length > 0) $scope.validUsers.pop();
		while($scope.visibleUsers.length > 0) $scope.visibleUsers.pop();
		while($scope.groups.length > 0) $scope.groups.pop();
		fullGroups = [];
		$scope.legend = [];
		fullLegend = [];
		
		$scope.refreshCnt = 0;
		
		graph.clearGraph();
		CFIUFService.clear();
		
		$scope.processIndex = 0;
		$scope.completedCFIUFCount = 0;
		$scope.maxProcesses = 6;
		$scope.activeProcesses = 1;
	}
	
	/**
	 * Function to handle the graph zoom event being fired.
	 */
	$scope.$on('graphZoom', function (event, data) {
		// Let the view know we're zoomed in; add a button to restore the graph to its original form.
		$scope.status.zoomed = true;
		
		// Update the collection of actually visible users.
		$scope.visibleUsers = $scope.groups[data.group-1].users;
		
		var ev = {};
		ev.groups = true;
		ev.generalityBias = $scope.generalityBias;
		ev.ontologies = _.map($scope.visibleUsers, function(user) { return user.userOntology.ontology; });
		
		CFIUFGroupService.doWork(ev).then(function(newOntologies) {
			var cfiufMaps = [];
			
			_.each(newOntologies.ontologies, function(newOntology, i) {
				$scope.visibleUsers[i].userOntology.cfiufMap = newOntology.cfiufMap;
				$scope.visibleUsers[i].userOntology.topTypes = newOntology.topTypes;
				cfiufMaps.push(newOntology.cfiufMap);
			});
			
			updateSimilarityGraph($scope.visibleUsers.length, cfiufMaps);
		});
	});
	
	/**
	 * Function the go from a zoomed view of the graph back to the original view.
	 */
	$scope.restoreGraph = function() {
		if(!$scope.status.clusteringFinished) return;
		
		graph.restoreGraph();
		$scope.status.zoomed = false;
		$scope.legend = fullLegend;
		$scope.visibleUsers = $scope.validUsers;
		$scope.groups = fullGroups;
		graph.start();
	}
	
	$scope.updateBias = function() {
		if(!$scope.status.clusteringFinished) return;
		
		$scope.status.updatingCFIUF = true;
		
		if(!$scope.status.zoomed) {
			$scope.status.clusteringFinished = false;
			
			// Setup the event to send to the Web Worker.
			var event = {};
			event.groups = false;
			event.ontologies = [];
			event.generalityBias = $scope.generalityBias;
			
			CFIUFService.doWork(event).then(function(data) {
				var cfiufMaps = [];
				
				if(data.ontologies.length > 0) {
					// The new CF-IUF matrix has been calculated and returned. Update the users and CF-IUF maps with the new ontologies.
					
					_.each(data.ontologies, function(newOntology, i) {
						$scope.validUsers[i].userOntology.cfiufMap = newOntology.cfiufMap;
						$scope.validUsers[i].userOntology.topTypes = newOntology.topTypes;
						cfiufMaps.push(newOntology.cfiufMap);
					});
					
					$scope.status.updatingCFIUF = false;
					updateSimilarityGraph(cfiufMaps.length, cfiufMaps, true);
				}
			});
			
		} else {
			graph.clearLinks();
			graph.start(true);
			
			var event = {};
			event.groups = true;
			event.generalityBias = $scope.generalityBias;
			event.ontologies = _.map($scope.visibleUsers, function(user) { return user.userOntology.ontology; });
			
			CFIUFGroupService.doWork(event).then(function(newOntologies) {
				var cfiufMaps = [];
				
				_.each(newOntologies.ontologies, function(newOntology, i) {
					$scope.visibleUsers[i].userOntology.cfiufMap = newOntology.cfiufMap;
					$scope.visibleUsers[i].userOntology.topTypes = newOntology.topTypes;
					cfiufMaps.push(newOntology.cfiufMap);
				});
				
				$scope.status.updatingCFIUF = false;
				updateSimilarityGraph($scope.visibleUsers.length, cfiufMaps);
			});
		}
		
	}
	
	/**
	 * Update the CF-IUF scores for all entities (can be users or groups of users) up to entities[userIndex].
	 * We do this in a Web Worker (separate processing thread), which is activated by sending it an event.
	 */
	function updateCFIUF(entities, finalizing) {
		// If we're already updating, return.
		if(!finalizing)
			if($scope.status.updatingCFIUF || $scope.status.updatingSimilarityGraph) return;
		
		$scope.status.updatingCFIUF = true;
		
		var startTime = new Date().getTime();
		
		// Setup the event to send to the Web Worker.
		var event = {};
		event.groups = false;
		event.ontologies = _.map(_.slice(entities, $scope.completedCFIUFCount), function(e) { return e.userOntology.ontology; });
		event.generalityBias = $scope.generalityBias;
		
		// Send the ontologies.
		if(event.ontologies.length > 0) {
			CFIUFService.doWork(event).then(function(data) {
				var cfiufMaps = [];
				
				if(data.ontologies.length > 0) {
					// The new CF-IUF matrix has been calculated and returned. Update the users and CF-IUF maps with the new ontologies.
					
					$scope.completedCFIUFCount = data.ontologies.length;
					
					_.each(data.ontologies, function(newOntology, i) {
						$scope.validUsers[i].userOntology.cfiufMap = newOntology.cfiufMap;
						$scope.validUsers[i].userOntology.topTypes = newOntology.topTypes;
						cfiufMaps.push(newOntology.cfiufMap);
					});
					
					if(finalizing) $scope.status.updatingSimilarityGraph = false;
					updateSimilarityGraph($scope.completedCFIUFCount, cfiufMaps, finalizing);
				} 

				$scope.status.updatingCFIUF = false;
				
				// Get the execution time for profiling purposes.
				var endTime = new Date().getTime();
				console.log("CF-IUF execution time: " + (endTime - startTime));
			});
		} else {
			if(finalizing) {
				$scope.status.updatingSimilarityGraph = false;
				var allMaps = _.map(entities, function(e) { return e.userOntology.cfiufMap; });
				updateSimilarityGraph($scope.completedCFIUFCount, allMaps, finalizing);
			}
			
			$scope.status.updatingCFIUF = false;
			
			// Get the execution time for profiling purposes.
			var endTime = new Date().getTime();
			console.log("CF-IUF execution time: " + (endTime - startTime));
		}
		
	}
	
	/**
	 * Function to update the similarity graph with new data.
	 */
	function updateSimilarityGraph(userCount, cfiufMaps, finalizing) {
		
		// If we're already updating, return (this shouldn't happen).
		if($scope.status.updatingSimilarityGraph) return;
		$scope.status.updatingSimilarityGraph = true;
		
		var startTime = new Date().getTime();
		
		// Build the event to send to the Web Worker.
		var similarityLinks = [];
		var ev = {};
		ev.userCount = userCount;
		ev.minSim = $scope.minimumSimilarity;
		ev.cfiufMaps = cfiufMaps;
		
		/**
		 * Function to catch updates and push them to the similarity graph.
		 */
		var removeOnUpdate = $scope.$on('simGraphUpdate', function(event, data) { similarityLinks.push([data.i, data.j, data.similarity]); });
		
		SimilarityService.doWork(ev).then(function(data) {
			
			removeOnUpdate();
			
			// Simgraph done. Let's update the CF-IUF in parallel with clustering.
			
			if(!$scope.status.zoomed && !finalizing) {
				$timeout(function() {
					$scope.status.updatingSimilarityGraph = false;
				}, 3000);
			} else {
				$scope.status.updatingSimilarityGraph = false;
			}
			
			var endTime = new Date().getTime();
			console.log("Similarity graph execution time: " + (endTime - startTime));
			
			// Finally, cluster the similarity graph.
			if(!$scope.status.clusteringNetwork) {
				$scope.clusterNetwork(userCount, similarityLinks, finalizing);
			} else {
				if(finalizing) {
					$scope.status.awaitingFinalClustering = true;
					
					// Add a watcher:  we want to cluster the final graph, but must wait for the current clustering operation to finish.
					var removeWatchClusteringNetwork = $scope.$watch('status.clusteringNetwork', function() {
						if(!$scope.status.clusteringNetwork) {
							$scope.status.awaitingFinalClustering = false;
							
							// clusteringNetwork has changed to false. Final update.
							$scope.clusterNetwork(userCount, similarityLinks, finalizing);
							
							
							
							// Remove this watcher.
							removeWatchClusteringNetwork();
						}
					});
				}
			}
		});
	}
	
	/**
	 * Function to cluster the network, assuming we have a completed similarity graph.
	 */
	$scope.clusterNetwork = function(userCount, similarityLinks, finalizing) {
		
		// If we're already updating, return (this shouldn't happen).
		if($scope.status.clusteringNetwork) return;
		$scope.status.clusteringNetwork = true;
		
		// Get the nodes and links from the current graph.
		if(!$scope.status.zoomed) {
			graph.initializeGraph(userCount, similarityLinks, $scope.visibleUsers);
			//graph.start(false);
		}
		
		$scope.groups = [];
		var clusters = [];
		
		// Function to catch updates from the HCS cluster algorithm and push them to the cluster graph.
		var removeOnHCSUpdate = $scope.$on('hcsUpdate', function(event, cluster) {
			
			if(!cluster.edges) {
				_.each(cluster.nodes, function(nodeIndex) { graph.setGroup(nodeIndex, 0); });
				return;
			}
			
			// Initialize the new group to assign this cluster to.
			var group = { users: [], userOntology: { ontology: {} } };
			var sortedNodes =_.sortBy(cluster.nodes);
			_.each(sortedNodes, function(nodeIndex) {
				// Get the user this node represents, and add him to the group.
				var user = $scope.visibleUsers[nodeIndex];
				group.users.push(user);
				
				// Merge YAGO types of this user into the YAGO types of the group.
				_.each(Object.keys(user.userOntology.ontology), function(type) {
					group.userOntology.ontology[type] = _.isNumber(group.userOntology.ontology[type]) ? 
							group.userOntology.ontology[type]+user.userOntology.ontology[type] : user.userOntology.ontology[type];
				});
				
				// Release the nodes from the rest of the graph (and temporarily from each other).
				//if(!$scope.status.zoomed) graph.removeNodeLinks(nodeIndex);
			});
			
			// Update the groups.
			$scope.groups.push(group);
			graph.updateGraph(sortedNodes, cluster.edges, $scope.groups.length, $scope.visibleUsers);
			graph.start(false);
			
			clusters.push(cluster);
		});
		
		var e = {};
		e.nodeCount = userCount;
		e.links = similarityLinks;
		
		HCSService.doWork(e).then(function(data) {
			removeOnHCSUpdate();
			
			// We've finished calculating the cluster graph. Render the final version by removing any leftover nodes.
			//graph.removeLinksByGroup(0);
			//if(finalizing) {
				//graph.start(false);
				//console.log("Final update? Removing 0 nodes!");
				//graph.removeNodesByGroup(0);
			//}
			
			if($scope.status.zoomed) graph.start(true);
			else graph.start(false);
			
			// Build the event for CF-IUF.
			var ev = {};
			ev.groups = true;
			ev.generalityBias = $scope.generalityBias;
			ev.ontologies = _.map($scope.groups, function(group) { return group.userOntology.ontology; });
			
			CFIUFGroupService.doWork(ev).then(function(newOntologies) {
				var labelString = "\nTopic labels:\n\n";
				$scope.legend = [];
				var i = $scope.groups.length;
				
				_.each($scope.groups, function(group, i) {
					group.userOntology = newOntologies.ontologies[i];
					
					var legendText = group.userOntology.topTypes[0][0];
					labelString += "Topic " + (i+1) + ": ";
					
					for(var j = 1; j < group.userOntology.topTypes.length; j++)
						legendText += ", " + group.userOntology.topTypes[j][0];
					
					$scope.legend.push( {text: legendText, group: (i+1)} );
					labelString += legendText + "\n";
				});
				
				if(i == 0) $scope.legend.push( {text: "No further clusters could be determined.", group: 0} );
				
				if($scope.status.awaitingFinalClustering) {
					$scope.status.clusteringNetwork = false;
				} else {
					if(!$scope.status.zoomed && finalizing && !$scope.status.updatingCFIUF && !$scope.status.updatingSimilarityGraph) {
						$scope.status.clusteringFinished = true;
						$scope.status.clusteringNetwork = false;
						
						$timeout(function() {
							graph.cloneGraph();
							fullGroups = _.cloneDeep($scope.groups);
							fullLegend = _.clone($scope.legend);
						}, 1000);
						
					} else if($scope.status.zoomed) {
						$scope.status.clusteringFinished = true;
						$scope.status.clusteringNetwork = false;
					} else {
						$timeout(function() {
							$scope.status.clusteringNetwork = false;
						}, 3000);
					}
				}

				console.log(labelString);
				
				// Evaluate the accuracy of the clustering result (if ground truth present).
				//if(!_.isEmpty(EvaluationService.getRelevanceScores())) EvaluationService.mcc($scope.groups, $scope.visibleUsers.length);
			});
		});
	}
	
	/**
	 * Function to cancel graphing and start from the similarity graph again. 
	 */
	function finalize() {
		console.log("Finalizing.");
		
		// Reset and apply final update.
		SimilarityService.restart();
		
		if(!$scope.status.updatingCFIUF) updateCFIUF($scope.validUsers, true);
		else {
			var removeWatchUpdatingCFIUF = $scope.$watch('status.updatingCFIUF', function() {
				if(!$scope.status.updatingCFIUF) {
					
					// updatingCFIUF has changed to false. Final update.
					updateCFIUF($scope.validUsers, true);
					
					// Remove this watcher.
					removeWatchUpdatingCFIUF();
				}
			});
		}
	}
	
	/**
	 * Watch for valid user additions. When we get a new user we may want to update the CF-IUF matrix.
	 */
	$scope.$on('userUpdated', function () {
		// New user has been added. Check that we're not waiting for the final update and still loading users.
		if($scope.status.loadingUsers && !$scope.status.updatingSimilarityGraph) {
			updateCFIUF($scope.validUsers, false);
		} else if(!$scope.status.loadingUsers) {
			console.log("Final 'userUpdated' has been broadcast (we're done collecting). Add a watcher for the final CF-IUF, or just do it if the final update is pending.");
			finalize();
		}
	});
	
	/**
	 * Function to get the initial user. We want this to be fast, so we get just the user first (without tweets/traits unless already in DB).
	 * If the user is found to be valid, we update it with tweets/traits immediately after.
	 * 
	 * @param screenName
	 */
	$scope.getSeedUser = function(screenName) {
		// This is always the first function call of a run through the app, so initialize everything fist.
		$scope.init();
		$scope.status.loadingInitialData = true;
		
		// Get a simple user: no tweets/traits unless already in DB.
		SimpleUser.get({ screenName: screenName, confidence: $scope.nerConfidence, 
						   support: $scope.nerSupport, concatenation: $scope.concatenation }, function(user) {

				$scope.status.loadingInitialData = false;
				
				if(user.screenName) {
					// User exists. Add to all users.
					$scope.users.push(user);
					
					// For the seed user, we want to show him even if invalid.
					$scope.visibleUsers.push(user);
					
					if(isValidUser(user)) {
						// User is valid, even. Check if he already has traits.
						if(user.userOntology.typeCount === 0) {
							// Nope. Update the user with tweets/traits.
							updateUser(user, true); 
						} else {
							// Yep. Process this user.
							$scope.validUsers.push(user);
							$scope.$broadcast('userUpdated');
						}
					}
				} else {
					// User doesn't exist in Twitter.
					$scope.status.noUserFound = true;
				}
		});
	};

	/**
	 * Function to update an existing user with tweets/traits.
	 */
	function updateUser(user, isSeed) {
		// Make known to the view that we're loading tweets/traits.
		user.loading = true;
		
		// Get a full user: get tweets/traits from Twitter/DBepdia if needed.
		User.get({ screenName: user.screenName, confidence: $scope.nerConfidence, support: $scope.nerSupport, 
			concatenation: $scope.concatenation, englishRate: $scope.minimumEnglishRate, tweetCount: $scope.tweetsPerUser },
			function(userData) {
				// Set the basic updated user info. We can't replace the entire user object because reasons.
				user.userID = userData.userID;
				user.properties = userData.properties;
				user.tweetCount = userData.tweetCount;
				user.loading = false;
				
				// Set the new English rate calculated from the user's tweets on the server.
				user.englishRate = userData.englishRate;

				// Check user validity.
				if(isValidUser(user) && isEnglishUser(user)) {
					// User is valid and has enough English tweets. Set tweets/traits found.
					user.tweets = userData.tweets;
					user.userOntology = userData.userOntology;
					
					$scope.validUsers.push(user);
					
					if(!isSeed) {
						$scope.visibleUsers.push(user);
					}
				}
				
				// Broadcast that we have updated a user (whether valid or not).
				$scope.$broadcast('userUpdated');
		});
	}
	
	/**
	 * Function to get the all the users from a specified list of screenNames.
	 * Users are processes in parallel, with maxProcesses threads.
	 */
	$scope.updateUsers = function(i) {
		// Let the view know we're loading the users.
		$scope.status.loadingUsers = true;
		
		// Make sure we actually have as many users as max processes...
		var limit = Math.min($scope.maxProcesses, $scope.users.length-i);
		
		// Start by updating the first user (updateUser is an async function).
		updateUser($scope.users[i]);
		$scope.processIndex += (i+1);
		limit--;
		
		// Then, fill up the max active processes by fetching users up until that point.
		while(limit--) {
			updateUser($scope.users[$scope.processIndex]);
			$scope.processIndex++;
			$scope.activeProcesses++;
		}
		
		// Now, wait for processes being freed up (userUpdated being broadcast). Whenever this happens, process the next user.
		var removeOnUserUpdated = $scope.$on('userUpdated', function () {
			
			// Check if there are still users left to process.
			if($scope.processIndex < $scope.users.length) {
				// Yep. Fetch the next user.
				updateUser($scope.users[$scope.processIndex]);
				$scope.processIndex++;
			} else {
				// Nope. Free up the process.
				$scope.activeProcesses--;
				
				// Check if this was the last process...
				if($scope.activeProcesses === 0) {
					
					console.log("Last process detected!");
					
					// Yep. This means we're done.
					$scope.status.loadingUsers = false;
					// Remove this $on function by calling it.
					removeOnUserUpdated();
					
					$scope.$broadcast('userUpdated');
				}
			}
		});
	};
	
	/**
	 * Get a list of users from a seed user's followers (and their followers (and their followers (and etc.))).
	 */
	$scope.getUserListFromSeed = function(user) {
		FollowersList.list({ screenName: user.screenName, userCount: $scope.userCount }, function(userScreenNameList) {
			_.each(userScreenNameList, function(screenName) {
				$scope.users.push({ screenName: screenName });
			});
			
			$scope.updateUsers(1);
		});
	}
	
	/**
	 * Get a list of users who mentioned some keyword from Twitter.
	 */
	$scope.getKeywordUsers = function(keyword) {
		$scope.status.loadingInitialData = true;
		
		KeywordUserList.list({ keyword: encodeURIComponent(keyword), userCount: $scope.userCount }, function(keywordUserList) {
			_.each(keywordUserList, function(screenName) {
				$scope.users.push({ screenName: screenName });
			});
			
			$scope.status.loadingInitialData = false;
			$scope.updateUsers(0);
		});
	};
	
	/**
	 * Check to see a user is protected or has too little tweets.
	 * Set the user error value if so.
	 */
	function isValidUser(user) {
		if(user.properties.protectedUser) {
			user.error = "This user is protected.";
			return false;
		} else if(user.properties.statusesCount < $scope.minTweets) {
			user.error = "This user does not have enough tweets.";
			return false;
		}
		
		user.valid = true;
		return true;
	}
	
	/**
	 * Check to see a user has enough English tweets.
	 * Set the user error value if not.
	 */
	function isEnglishUser(user) {
		if(user.englishRate < $scope.minimumEnglishRate) {
			user.error = "This user's English rate is too low.";
			return false;
		}
		return true;
	}
	
	/**
	 * Function to update page size (used for infinite scrolling).
	 */
	$scope.loadMore = function() { $scope.pageSize = $scope.pageSize + 5; }
}]);