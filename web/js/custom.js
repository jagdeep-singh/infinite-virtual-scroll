var data = [];

function getData() {
    var data = [];
    for(var i =0; i< 400000;i ++){
        data.push({"name": "Sample Name "+ i, "id" : i});
    }
    return data;
}

ivs.init({
    id : "divContainer",
    data : getData(),        // required
    render : function (dataItem) {
        return "<div>Name : "+dataItem.name+ " Id : "+ dataItem.id +"</div>";
    },
    onRender : function(element, dataItem, index, startIndex, endIndex){
        // console.log(dataItem);
    }
});

ivs.init({
    id : "tableContainer",
    listContainerId : "tableListContainer",
    data : getData(),        // required
    render : function (dataItem) {
        return "<tr style='height: 40px;width: 95%;display: flex;'><td style='width: 10%;'>" + (parseInt(dataItem.id)+1) + "</td><td style='width: 75%;'>"+dataItem.name+ "</td> <td style='width: 15%;'>"+ dataItem.id +"</td></tr>";
    },
    onRender : function(element, dataItem, index, startIndex, endIndex){
        // console.log(dataItem);
    }
});