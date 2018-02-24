var red = {hue:0.04*360, saturation:0.87, brightness:0.90 };
var yellow = {hue:0.12*360, saturation:0.88, brightness:0.93 };
var blue = {hue:0.53*360, saturation:0.82, brightness:0.28 };
var black = {hue:0, saturation:0, brightness:0 };


var projectVectors = new OrigamiPaper("canvas-vectors", new CreasePattern().setBoundary([new XY(-1.0,-1.0),new XY(1.0,-1.0),new XY(1.0,1.0),new XY(-1.0,1.0)]));
projectVectors.style.mountain.strokeWidth = 0.02;
projectVectors.style.mountain.strokeColor = { gray:0.0, alpha:1.0 };
projectVectors.cp.edges = projectVectors.cp.edges.filter(function(el){ return el.orientation !== CreaseDirection.border});
projectVectors.style.selectedNode.fillColor = yellow;
projectVectors.style.selectedNode.radius = 0.04;


projectVectors.validNodes = [];
projectVectors.draggingNode = undefined;
projectVectors.arcLayer = new projectVectors.scope.Layer();
projectVectors.arcLayer.sendToBack();
projectVectors.backgroundLayer.sendToBack();
// projectVectors.edgeLayer.bringToFront();
// projectVectors.mouseDragLayer.bringToFront();

projectVectors.updateAngles = function(){
	this.arcLayer.activate();
	this.arcLayer.removeChildren();
	var nodes = this.validNodes.map(function(el){return new XY(el.x, el.y);});
	var bisections = bisect(nodes[0], nodes[1]);
	var small = bisections[0];
	var large = bisections[1];
	// bisect smaller angle
	var arc1Pts = [ new XY(this.validNodes[0].x, this.validNodes[0].y), small, new XY(this.validNodes[1].x, this.validNodes[1].y) ];
	for(var i = 0; i < 3; i++){ arc1Pts[i] = arc1Pts[i].normalize().scale(0.25); }
	// bisect larger angle
	var arc2Pts = [ new XY(this.validNodes[0].x, this.validNodes[0].y), large, new XY(this.validNodes[1].x, this.validNodes[1].y) ];
	for(var i = 0; i < 3; i++){ arc2Pts[i] = arc2Pts[i].normalize().scale(0.3); }
	// draw things
	var smallArc = new this.scope.Path.Arc(arc1Pts[0], arc1Pts[1], arc1Pts[2]);
	smallArc.add(new this.scope.Point(0.0, 0.0));
	smallArc.closed = true;
	var largeArc = new this.scope.Path.Arc(arc2Pts[0], arc2Pts[1], arc2Pts[2]);
	largeArc.add(new this.scope.Point(0.0, 0.0));
	largeArc.closed = true;
	var smallLine = new this.scope.Path({segments:[[0.0, 0.0], [small.x,small.y]], closed:true});
	var largeLine = new this.scope.Path({segments:[[0.0, 0.0], [large.x,large.y]], closed:true});

	Object.assign(smallLine, this.style.mountain);
	Object.assign(largeLine, this.style.mountain);
	Object.assign(smallLine, {strokeColor:yellow});
	Object.assign(largeLine, {strokeColor:blue});
	Object.assign(smallArc, this.style.mountain);
	Object.assign(largeArc, this.style.mountain);
	Object.assign(smallArc, {strokeColor:null, fillColor:blue});
	Object.assign(largeArc, {strokeColor:null, fillColor:red});
}

projectVectors.reset = function(){
	this.selectNearestNode = true;
	var creases = [
		this.cp.crease(new XY(0.0, 0.0), new XY(Math.random()*2-1.0, Math.random()*2-1.0)).mountain(),
		this.cp.crease(new XY(0.0, 0.0), new XY(Math.random()*2-1.0, Math.random()*2-1.0)).mountain()
	];
	this.cp.clean();
	this.validNodes = [
		creases[0].uncommonNodeWithEdge(creases[1]),
		creases[1].uncommonNodeWithEdge(creases[0])
	];
	this.draw();
	this.updateAngles();
}
projectVectors.reset();

projectVectors.onFrame = function(event) { }
projectVectors.onResize = function(event) { }
projectVectors.onMouseDown = function(event){
	if(this.validNodes.contains(this.nearestNode)){
		this.draggingNode = this.nearestNode;
	}
}
projectVectors.onMouseUp = function(event){
	this.draggingNode = undefined;
}
projectVectors.onMouseMove = function(event){
	if(this.draggingNode !== undefined){
		this.draggingNode.x = event.point.x;
		this.draggingNode.y = event.point.y;
	}
	this.update();
	this.updateAngles();
}
projectVectors.onMouseDidBeginDrag = function(event){ }