google.load('visualization', '1', {'packages': ['table', 'corechart']});
google.setOnLoadCallback(initialize);
var gdtable;
var gtdview;
var gtable;
var gcdview;
var gchart;
var gchartisready = false;
var initialgraph = true;
var gdefaultCategory = "";
var gTitle = "";
var ghaxis = {
	title: "Permeation",
	units: "Barrer",
	format: ""
};
var gdColumns = {
		Category:0,
		Brief_Description:0,
		Extended_Description:0,
		Data:[],
		Reference_Number:0,
		In_Reference_Data_Location:0,
		Reference_Name:0,
		Reference_URL:0,
		ChartColumns:[],
		Gas1index:3,
		Gas2index:4,
		Gas1name:"CO2",
		Gas2name:"N2",
		SelectedSeries:0
	};

function convertLetterToNumber(str) {
  var out = 0, len = str.length;
  for (pos = 0; pos < len; pos++) {
    out += (str.charCodeAt(pos) - 64) * Math.pow(26, len - pos - 1);
  }
  return out-1;
}

function initialize() {
	document.getElementById('gtable-header-div').style.display = "block";
	document.getElementById('gtable-div').innerHTML = "";

	gtitle = document.getElementById('gtable-title').innerHTML;
	gdefaultCategory = document.getElementById('gtable-filter').innerHTML;
	gdColumns.Gas1name = document.getElementById('gtable-column1').innerHTML;
	gdColumns.Gas2name = document.getElementById('gtable-column2').innerHTML;

	ghaxis.title = document.getElementById('gtable-hAxis').innerHTML;
	ghaxis.units = document.getElementById('gtable-hAxisUnits').innerHTML;
	ghaxis.format = document.getElementById('gtable-hAxisFormat').innerHTML;

	var csvUrl = document
		.getElementById('google-source')
		.getAttribute('data-csv-url');

Papa.parse(csvUrl, {
  download: true,
  header: true,
  dynamicTyping: false,
  skipEmptyLines: true,

  complete: function(results) {
    var data = new google.visualization.DataTable();
    var headers = Object.keys(results.data[0]);

    headers.forEach(function(header) {
      if (header.indexOf("Data:") !== -1) {
        data.addColumn("number", header);
      } else {
        data.addColumn("string", header);
      }
    });

    results.data.forEach(function(row) {
      var rowArray = headers.map(function(h, i) {
        var value = row[h];

        if (value === "" || value === undefined || value === null) {
          return null;
        }

        if (data.getColumnType(i) === "number") {
          var num = Number(value);
          return isNaN(num) ? null : num;
        }

        return String(value);
      });

      data.addRow(rowArray);
    });

    drawChartArray({
      isError: function() { return false; },
      getDataTable: function() { return data; }
    });
  }
});

// closes initialize()
}

function updateTable(forced) {
	forced = forced || false;
	
	//prep
	var chartSelection = gchart.getSelection();
	if(typeof chartSelection === "undefined") {
		//error centrals
	} else if (chartSelection!=null) {
		//selected something

		//ISSUE there are still errors, that popup when disabling, 
		//then enabling autopop, the deselecting a cateogory
		try {
			//show one selected category by the gchart
			var selectedCategory = gdtable.getColumnLabel(gcdview.getTableColumnIndex(chartSelection[0].column.valueOf())); 
			if (selectedCategory == 'Overlay') selectedCategory = gdefaultCategory;

			var chartSelectionRows = getChartSelectionRows();
			var categoryshown = document.getElementById('category-shown-div');
			
			if (document.getElementById("autopop-checkbox").checked == true) {
				//pop selection to the overlay
				popOverlay(selectedCategory, chartSelectionRows);
			}
			
			//does the gtable need to switch category?
			if (categoryshown.innerHTML == selectedCategory) {
				//same category: do not redraw, just reselect
			} else {
				//a new category: redraw and reselect
				gtdview.setRows(gdtable.getFilteredRows([{column: gdColumns.Category, value: selectedCategory}]));
			}

			//set gtable selection if/now gtable has changed
			var tableSelection = new Array();
			for (var i=0; i<chartSelectionRows.length; i++) {
					tableSelection[i] = {row:gtdview.getViewRowIndex(chartSelectionRows[i]), column:null};
			}

			//what to draw: 
			//gtable and/or selection
			if (!forced && categoryshown.innerHTML == selectedCategory) {
				//same category: do not redraw, just reselect
				gtable.setSelection(tableSelection);
			} else {
				//a new category: redraw and reselect
				drawTable(selectedCategory, tableSelection);
				
			}
		} catch(err) {
			//fix later
		}
	} else {
		//null selection
		//show all categories
		document.getElementById('category-show-all-button').disabled=true;
		gtdview.setRows(0,gdtable.getNumberOfRows()-1); //gdtable.getNumberOfRows()
		drawTable("All Categories", null);
	}
}

function drawChartArray(response) {
	if (response.isError()) {
	  alert('Error in query');
	  return;
	}
	
	//receive dataTable
	gdtable=response.getDataTable();
	
	//rename headers
	var columnCount = gdtable.getNumberOfColumns();
	var categoryTypes = ['Category:','Brief Description:','Extended Description:','Data:','In Reference Data Location:','Reference Name:','Reference URL:'];
	
	//remove all unneccesary columns
	var deletecolumn = true;
	for (var i=columnCount-1; i>=0; i--) {
		deletecolumn = true;
		for (var j=0; j<categoryTypes.length; j++) {
			if (gdtable.getColumnLabel(i).indexOf(categoryTypes[j]) != -1) {
				//save that column
				deletecolumn = false;
				break;
			}
		}
		if (deletecolumn == true) {
			gdtable.removeColumn(i)
		}
	}
	
	// categorise columns
	columnCount = gdtable.getNumberOfColumns();
	var labelString = '';
	for (var i=0; i<columnCount; i++) {
		labelString = gdtable.getColumnLabel(i);
		for (var j=0; j<categoryTypes.length; j++) {
			if (labelString.indexOf(categoryTypes[j]) !== -1) {
				switch(categoryTypes[j]) {
					case 'Category:':
						gdColumns.Category = i;
						break;
					case 'Brief Description:':
						gdColumns.Brief_Description = i;
						break;
					case 'Extended Description:':
						gdColumns.Extended_Description = i;
						break;
					case 'Data:':
						gdColumns.Data[gdColumns.Data.length] = i;
						break;
					case 'In Reference Data Location:':
						gdColumns.In_Reference_Data_Location = i;
						break;
					case 'Reference Name:':
						gdColumns.Reference_Name = i;
						break;
					case 'Reference URL:':
						gdColumns.Reference_URL = i;
						break;
				}
				break;
			}
		}
		//rename label
		gdtable.setColumnLabel(i,labelString.substring(labelString.indexOf(':')+1).replace(/^\s+|\s+$/g, ''));
	}
	
	//add options to select
	var Pselect1 = document.getElementById("Pselect1");
	var Pselect2 = document.getElementById("Pselect2");
	for(var i=0; i < gdColumns.Data.length; i++) {
		Pselect1.options.add(new Option(gdtable.getColumnLabel(gdColumns.Data[i]), i))
		Pselect2.options.add(new Option(gdtable.getColumnLabel(gdColumns.Data[i]), i))
	}
	Pselect1.onclick=function(){testPselect();};
	Pselect2.onclick=function(){testPselect();};
	document.getElementById("compareP-button").onclick=function(){comparePermeation();};
	
	//set inital positions
	Pselect1.selectedIndex = 0;
	Pselect2.selectedIndex = Math.floor(Pselect2.length/2);
		
	for (var i=0; i < Pselect1.length; i++) {
		if (Pselect1.options[i].text == gdColumns.Gas1name) Pselect1.selectedIndex = i;
		if (Pselect2.options[i].text == gdColumns.Gas2name) Pselect2.selectedIndex = i;
	}
	gdColumns.Gas1index = Pselect1.selectedIndex+3;
	gdColumns.Gas2index = Pselect2.selectedIndex+3;

	//add reference number column
	gdtable.addColumn("string", "", "R"); // adds column: (type, Label, ID)
	gdColumns.Reference_Number = gdtable.getNumberOfColumns()-1;
	
	//get reference array
	var refarray = gdtable.getDistinctValues(gdColumns.Reference_URL);
	var drows = new Array();
	
	//offset if there is a null reference
	//so null reference does not get set as reference [1] but reference []
	var startrow = 0;
	if (refarray[0] == "") { 
		startrow=1; 
	}
	//alert(gdColumns.Reference_Number);
	for (var i=startrow; i<refarray.length; i++) {
		drows = gdtable.getFilteredRows([{column: gdColumns.Reference_URL, value: refarray[i]}]);
		for (var j=0; j<drows.length; j++) {
			gdtable.setValue(drows[j], gdColumns.Reference_Number, (i+1-startrow).toString());
		}
	}

	var formatter = new google.visualization.PatternFormat('<span><span>{3}<div><a href="{2}">{1}</a></div></span></span><sup>[{0}]</sup>');
	formatter.format(gdtable, [gdColumns.Reference_Number, gdColumns.Reference_Name, gdColumns.Reference_URL, gdColumns.In_Reference_Data_Location]); 
	var formatter2 = new google.visualization.PatternFormat('{1} <span>{0}</span>');
	formatter2.format(gdtable, [gdColumns.Extended_Description, gdColumns.Brief_Description]); // Apply formatter
	
	
	//get category array, column length
	//initialise new columns
	var catarray = gdtable.getDistinctValues(gdColumns.Category);
	gdtable.addColumn('number', "Permeability", "P"); // adds column: (type, Label, ID)
	gdColumns.ChartColumns[gdColumns.ChartColumns.length] = gdtable.getNumberOfColumns()-1;
	for (var i=0; i<catarray.length; i++) {
		gdtable.addColumn("number", catarray[i], i.toString); // adds column: (type, Label, ID)
		gdColumns.ChartColumns[gdColumns.ChartColumns.length] = gdtable.getNumberOfColumns()-1;
	}
	gdtable.addColumn("number", "Overlay", "O"); // adds column: (type, Label, ID)
	gdColumns.ChartColumns[gdColumns.ChartColumns.length] = gdtable.getNumberOfColumns()-1;
	
	//initialise the gchart data view and gchart
	gcdview = new google.visualization.DataView(gdtable);
	gcdview.setColumns(gdColumns.ChartColumns);
	gchart = new google.visualization.ScatterChart(document.getElementById('gchart-div'));

	//initialise the gtable view and gtable
	gtdview = new google.visualization.DataView(gdtable);
	gtable = new google.visualization.Table(document.getElementById('gtable-div'));

	
	// Set a 'select' event listener for the gchart.
	// When the gchart is selected,
	// we set the selection on the gtable.
	google.visualization.events.addListener(gchart, 'select', updateTable);
	
	google.visualization.events.addListener(gchart, 'ready', function(event) {
		gchartisready = true;
		document.getElementById("autopop-div").style.visibility = "visible";
		
		if (document.getElementById("autopop-checkbox").checked == true) {
			/*
			this is a workaround, the gchart should be able to handle a selection being given to it 
			before being ready to display it. the gtable works correctly: upon being given a draw and 
			set selection command without pause, it draws the gtable with the selection there. 
			however the gchart will not accept a set selection until even after it is ready, and there
			is no way to check reliably when it is ready to accept a set selection command. 
			
			The error: Cannot read property 'D' of null (where null is n) appears with the Google 
			formatting code, this could be currently worked around, however this shortcut notation 
			code is likely to change with any future update to the code by Google. 
			
			Hopefuly this bug will get fixed in future versions.
			*/
			
			var setUntilDone;
			
			setUntilDone = setInterval(function(){
				try {
					gchart.setSelection([{row:null, column:gdColumns.ChartColumns.length -1}]);
					clearInterval(setUntilDone);
				} catch(err) {
					//do nothing. hopefully Google fixes this error sometime
				}
			}, 100);
		}
	});
	
	google.visualization.events.addListener(gtable, 'select', function() {
		var selection = gtable.getSelection();
		
		if(gchartisready == false || typeof selection === "undefined") {
			//error centrals
		} else if (selection) {
			if (typeof selection[0] === "undefined") {
				//error centrals
			}else{
				// selected something // always rows
				var rowarray = new Array();
				for (var i=0; i<selection.length; i++) {
					rowarray[i] = gtdview.getTableRowIndex(selection[i].row);
				}
				
				var selectionarray = new Array();
				for (var i=0; i<selection.length; i++) {
					selectionarray[i] = {row:rowarray[i], column: null};
				}
				gchart.setSelection(selectionarray);
				
				//determine where first selected data point is from
				var columncount = gdColumns.ChartColumns.length;
				var columnLabel;
				for (var i=0; i<columncount; i++) {
					if (gdtable.getValue(rowarray[0], gdColumns.ChartColumns[i]) != null) {
						columnLabel = gdtable.getColumnLabel(gdColumns.ChartColumns[i]);
					}
				}
				
				//draw popup
				if (document.getElementById("autopop-checkbox").checked == true) {
					popOverlay (columnLabel, rowarray);
				}
			}
		}
	});
	
	//draw the gtable
	gtdview.setRows(gdtable.getFilteredRows([{column: gdColumns.Category, value: gdefaultCategory}]));
	drawTable(gdefaultCategory, null);
	//drawChart(gdefaultCategory);
	//draw chart once inside draw Table
}	


function getChartSelectionExists() {
	//so many ways to error
	//return true if it is safe to proceed
	var chartSelection = gchart.getSelection();
	if (typeof chartSelection === "undefined") {
		//error central
	} else if (chartSelection!=null) {
		//error central
		if (typeof chartSelection[0] === "undefined") {
			//error central
		} else {
			return true;
		}
	}
	return false;
}

function getChartSelectionRows() {
	var chartSelectionRows = new Array();
	if (getChartSelectionExists() == true) {
		//selected something
		var chartSelection = gchart.getSelection();
		var selectedCategory = gdtable.getColumnLabel(gcdview.getTableColumnIndex(chartSelection[0].column.valueOf())); 
		if (selectedCategory == 'Overlay') selectedCategory = gdefaultCategory;
		
		//points or column
		if (chartSelection[0].row == null) {
			//selected a column
			chartSelectionRows = gdtable.getFilteredRows([{column: gdColumns.Category, value: selectedCategory},	{column: gdColumns.Gas1index, minValue: 0}, {column: gdColumns.Gas2index, minValue: 0}]);
		} else {
			//selected points
			for (var i=0; i<chartSelection.length; i++) {
				chartSelectionRows[i] = chartSelection[i].row.valueOf();
			}
		}
	}
	return chartSelectionRows;
}

function getColumnIndex(columnLabel) {
	var columnCount = gdtable.getNumberOfColumns();
	var gdtableLabels = new Array();
	for (var i=0; i<columnCount; i++) {
		gdtableLabels[i] = gdtable.getColumnLabel(i);
	}
	return gdtableLabels.indexOf(columnLabel);
}

function popOverlay (selectedCategory, chartSelectionRows) {
	//clear overlay values
	var overlayColumn = gdColumns.ChartColumns[gdColumns.ChartColumns.length -1];
	var drows = new Array();
	var rowCount=gdtable.getNumberOfRows();
	for (var i=0; i<rowCount; i++) {
		gdtable.setValue(i, overlayColumn, null);
	}

	//set overlay values
	var selectedColumnIndex = getColumnIndex(selectedCategory);
	if (selectedColumnIndex != -1){
		for (var i=0; i<chartSelectionRows.length; i++) {
			gdtable.setValue(chartSelectionRows[i], overlayColumn, gdtable.getValue(chartSelectionRows[i], selectedColumnIndex));
		}
	}
	gdtable.setColumnLabel(overlayColumn, selectedCategory);

	//draw
	drawChart(selectedCategory);
}

function drawChart(selectedCategory) {
	if (selectedCategory == 'Overlay') selectedCategory = gdefaultCategory;

	//async render
	setTimeout(function(){
		document.getElementById("gchart-div").style.height = "532px";
		document.getElementById("compareP-div").style.visibility="hidden";
		document.getElementById("compareP-button").disabled = false;

		//visualise dataView in a gchart // 7,5 works well
		gchartisready = false
		gchart.draw(gcdview, getChartOptions(selectedCategory));
	},50);
}

function comparePermeationUpdate(gas1index, gas2index) {
	//prep
	document.getElementById("compareP-button").disabled = true;
	document.getElementById("compareP-div").style.visibility="visible";
	
	//do
	var drows = new Array();
	var gas1value = 0;
	
	//set x values
	var rowcount=gdtable.getNumberOfRows();
	for (var i=0; i<rowcount; i++) {
		gdtable.setValue(i, gdColumns.ChartColumns[0], null);
		gdtable.setValue(i, gdColumns.ChartColumns[gdColumns.ChartColumns.length -1], null);
	}
	for (var i=1; i<gdColumns.ChartColumns.length -1; i++) {
		//set y values
		//only write the values for the rows needed
		drows = gdtable.getFilteredRows([{column: 0, value: gdtable.getColumnLabel(gdColumns.ChartColumns[i])},{column: gdColumns.Gas1index, minValue: 0},{column: gdColumns.Gas2index, minValue: 0}]);
		rowcount = drows.length; //filtered row count
		for (var j=0; j<rowcount; j++) {
			gas1value = gdtable.getValue(drows[j], gdColumns.Gas1index);
			gdtable.setValue(drows[j], gdColumns.ChartColumns[0], gas1value);
			gdtable.setValue(drows[j], gdColumns.ChartColumns[i], Math.round(10000*gas1value / gdtable.getValue(drows[j], gdColumns.Gas2index))/10000);
		}
	}
	
	//draw
	drawChart();
	updateTable(true);
}

function getChartSeriesLabels() {
	var chartSeriesLabels = new Array();
	for (var i=1; i<gdColumns.ChartColumns.length; i++) {
		chartSeriesLabels[i-1] = gdtable.getColumnLabel(gdColumns.ChartColumns[i]);
	}
	return chartSeriesLabels;
}

function getChartOptions(overlayLabel) {
	var colorArray = ["#3366CC","#DC3912","#FF9900","#109618","#990099","#0099C6","#DD4477","#66AA00","#B82E2E","#316395","#994499","#22AA99","#AAAA11","#6633CC","#E67300","#8B0707","#651067","#329262","#5574A6","#3B3EAC","#B77322","#16D620","#B91383","#F4359E","#9C5935","#A9C413","#2A778D","#668D1C","#BEA413","#0C5922","#743411","#45AFE2","#FF3300","#FFCC00","#14C21D","#DF51FD","#15CBFF","#FF97D2","#97FB00","#DB6651","#518BC6","#BD6CBD","#35D7C2","#E9E91F","#9877DD","#FF8F20","#D20B0B","#B61DBA","#40BD7E","#6AA7C4","#6D70CD","#DA9136","#2DEA36","#E81EA6","#F558AE","#C07145","#D7EE53","#3EA7C6","#97D129","#E9CA1D","#149638","#C5571D"];
	var gas1string = gdtable.getColumnLabel(gdColumns.Gas1index);
	var gas2string = gdtable.getColumnLabel(gdColumns.Gas2index);
	var chartSeriesLabels = getChartSeriesLabels();
	var seriesOptions = new Array();
	
	//make sure all limits are lines, and all else are not
	for (var i=0; i<chartSeriesLabels.length; i++) {
		if (chartSeriesLabels[i].toLowerCase().indexOf("limit") != -1) {
			//contains 'limit'
			seriesOptions[i] = {color:colorArray[i], pointSize:0, lineWidth:2};
		} else {
			seriesOptions[i] = {color:colorArray[i]};
		}
	}
	
	//if called for, write the overlay colour
	if (overlayLabel != null) {
		var selectedColumn = chartSeriesLabels.indexOf(overlayLabel);
		seriesOptions[chartSeriesLabels.length-1] = {color:colorArray[selectedColumn], visibleInLegend: false};
	}
	
	var chartOptions = {
		chartArea:{left:80,top:40,width:440,height:440},
		pointSize:2.5,
		lineWidth:0,
		booleanRole:"certainty",
		animation:{duration:500},
		legend:{position: "right", textStyle: {fontSize: 12}},
		title: "" + gas1string + "/" + gas2string + " " + gtitle + " (Selection: " + overlayLabel + ")",
		hAxis:{
			title: gas1string + " " + ghaxis.title + " (" + ghaxis.units + ")",
			textStyle:{fontSize: 12},
			useFormatFromData:false,
			viewWindowMode:"pretty",
			logScale:true
		}, 
		vAxes:[{
			title: gas1string + "/" + gas2string +" Selectivity",
			textStyle:{fontSize: 12},
			useFormatFromData:false,
			viewWindowMode:"pretty",
			logScale:true
		}],
		series: seriesOptions
	};
	

	if (ghaxis.format != "") {
		chartOptions.hAxis.format = ghaxis.format;
	}
	
	return chartOptions;
}

function getSelectedText(elementId) {
	var elt = document.getElementById(elementId);
	if (elt.selectedIndex == -1) {return null;}
	return elt.options[elt.selectedIndex].text;
}

//Functions accessed via html code below
function comparePermeation() {
	if (document.getElementById("Pselect1").selectedIndex != document.getElementById("Pselect2").selectedIndex) {
		gdColumns.Gas1index = getColumnIndex(getSelectedText("Pselect1")); 
		gdColumns.Gas2index = getColumnIndex(getSelectedText("Pselect2")); 
		if (gdColumns.Gas1index != gdColumns.Gas2index) {
			comparePermeationUpdate(gdColumns.Gas1index, gdColumns.Gas2index);
		}
	}
}

function testPselect() {
	if (document.getElementById("Pselect1").selectedIndex == document.getElementById("Pselect2").selectedIndex) {
		document.getElementById("compareP-button").disabled = true;
	} else {
		document.getElementById("compareP-button").disabled = false;
	}
}

function drawTable(selectedCategory, selection) {
	//prep
	var categoryshown = document.getElementById('category-shown-div');
	var tableColumns = new Array();
	
	categoryshown.innerHTML = "Loading...";
	if (selectedCategory == "All Categories") {
		//add optional 
		gtdview.setRows(0,gdtable.getNumberOfRows()-1);
		tableColumns[tableColumns.length] = gdColumns.Category;
	}
	if (selectedCategory == 'Overlay') selectedCategory = gdefaultCategory;
	
	//add necessary columns
	tableColumns[tableColumns.length] = gdColumns.Extended_Description;
	/*
	for (var i=0; i<gdColumns.Data.length; i++) {
		tableColumns[tableColumns.length] = gdColumns.Data[i];
	}
	//*/
	
	/*
	if (gdColumns.FirstDataColumn > 0) {
		gdColumns.Gas1index -= (gdColumns.FirstDataColumn-3);
		gdColumns.Gas2index -= (gdColumns.FirstDataColumn-3);
		gdColumns.FirstDataColumn = 0;
	}
	tableColumns[tableColumns.length] = gdColumns.Data[gdColumns.Gas1index-gdColumns.FirstDataColumn];
	tableColumns[tableColumns.length] = gdColumns.Data[gdColumns.Gas2index-gdColumns.FirstDataColumn];
	//*/
	
	tableColumns[tableColumns.length] = gdColumns.Data[gdColumns.Gas1index-3];
	tableColumns[tableColumns.length] = gdColumns.Data[gdColumns.Gas2index-3];
	tableColumns[tableColumns.length] = gdColumns.Reference_Number;
	gtdview.setColumns(tableColumns);
	
	//data is set from the first read, now default back to 3
	//gdColumns.FirstDataColumn = 3;
	
	setTimeout(function(){
		//do
		document.getElementById('gtable-div').style.height = "100%";
		document.getElementById('gchart-header-div').style.display = "block";
		gtable.draw(gtdview, {allowHtml: true, width: "100%"});
		gtable.setSelection(selection);
		
		//report
		categoryshown.innerHTML = selectedCategory;
		var showbutton = document.getElementById('category-show-all-button');
			if (showbutton) {
			showbutton.style.visibility="visible";
			if (selectedCategory == "All Categories") {
				showbutton.disabled=true;
			} else {
				showbutton.disabled=false;
			}
		}
		
		//draw chart once
		if (initialgraph == true) {
			//draw the permeation graph
			initialgraph = false;
			comparePermeation();
			//comparePermeationUpdate(0, selIndex2);
		}
		
	},100);
}
