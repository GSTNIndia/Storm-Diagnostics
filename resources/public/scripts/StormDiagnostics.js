/*
-------------------------------------------------------------------------------
 Copyright 2019 Goods And Services Tax Network
 
 Licensed under the Apache License, Version 2.0 (the "License"); you may not
 use this file except in compliance with the License.  You may obtain a copy
 of the License at
 
   http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 License for the specific language governing permissions and limitations under
 the License.
-------------------------------------------------------------------------------
*/

//globals
var do_refresh = false;
var jstack_refresh_interval = 30;
var time_before_jstack_refresh = 60;
var REFRESH_TIMER_INTERVAL = 1;
var current_topology_id = null;
var current_host = null;
var current_port = null;
var rebalanceCommandGlobal = null;
var MAX_AUTO_REFRESH_COUNT = 3;
var pending_refresh_count;

var stacktraceDisplayUtil;
var topologyDropdownButton;
var stormWorkerDropdownButton;

const initialize_fn = () => {
    // populate the topologies
    $("#btn_topo_refresh").click(refresh_topologies_click_handler);
    refresh_topologies_click_handler();

    //start a thread for periodic refresh
    document.getElementById("refresh_rate").onclick = set_refresh_options;

    //instantiate class to manage stack trace display
    stacktraceDisplayUtil = new StacktraceDisplayUtil("jstack", "prefix", "thread_table");

    //instantiate the buttons with dropdowns
    stormWorkerDropdownButton = new AppDropdownButton("Worker", "storm_worker_div", "storm_worker_button", "storm_worker_list", storm_worker_click_handler, [stacktraceDisplayUtil]);
    topologyDropdownButton = new AppDropdownButton("Topology", "topo", "cur_topo", "topolist", topology_name_click_handler, [stormWorkerDropdownButton]);

    //to update the rebalanceCommand into modal while dispalying it
    $('#rebalanceCommandModal').on('show.bs.modal', function (event) {
        var modal = $(this);
        modal.find('#command').text(rebalanceCommandGlobal);
    })

    //set click handler for refresh button
    document.getElementById("refresh_once").onclick = function () {
        var worker_hostport = document.getElementById("storm_worker_button").innerText;
        storm_worker_click_handler(worker_hostport);
    }

    //assign oninput handler for the search text box
    document.getElementById("prefix").oninput = function () {
        stacktraceDisplayUtil.paint();
    }
    
    //to copy entire current threaddump into clipboard
    var clipboard = new ClipboardJS('#copyThreaddumpBtn', {
        text: function(trigger) {
            return stacktraceDisplayUtil.thread_dump_as_string();
        }
    });
    
    $('#copyThreaddumpBtn').tooltip();
    $('#refresh_once').tooltip({trigger : 'hover'});
    
    clipboard.on('success', function(e) {
        var el = $('#copyThreaddumpBtn');
        var elOriginalTitle = el.attr('data-original-title');
        el.attr('data-original-title', 'Copied To Clipboard!').tooltip('show');
        el.attr('data-original-title', elOriginalTitle);
    });

    clipboard.on('error', function(e) {
        var el = $('#copyThreaddumpBtn');
        var elOriginalTitle = el.attr('data-original-title');
        el.attr('data-original-title', 'Error while copying To Clipboard!').tooltip('show');
        el.attr('data-original-title', elOriginalTitle);
    });

}

window.onload = initialize_fn;

function getRebalanceCommand(topo_name, boltsToBeRabalanced) {

    //create rebalance command from boltsToBeRabalanced
    var rebalanceCommand = 'storm rebalance ' + topo_name + ' ';
    for (i = 0; i < boltsToBeRabalanced.length; i++) {
        boltIdAndExec = boltsToBeRabalanced[i];
        sepIndex = boltIdAndExec.lastIndexOf("#");

        boltId = boltIdAndExec.substring(0, sepIndex);
        noOfExec = boltIdAndExec.substring(sepIndex + 1);

        rebalanceCommand = rebalanceCommand + ' -e ' + boltId + '=' + noOfExec + ' ';
    }

    return rebalanceCommand;
}

function populate_bolts(topo_name, tableid, topoNameAndbolts) {

    rebalanceCommandGlobal = null;

    tableid_hashed = "#" + tableid;

    //empty the table
    $(tableid_hashed).empty();


    topoNameAndboltsJson = JSON.parse(topoNameAndbolts);
    topo_name = topoNameAndboltsJson.name;
    boltsArray = topoNameAndboltsJson.bolts;

    $("#" + "bolts_div").show();

    var tableEmpty = true;
    var showCommand = false;

    var rows = [];
    var boltsToBeRabalanced = [];

    for (i = 0; i < boltsArray.length; i++) {
        var bolt = boltsArray[i];

        var eligibleForRebalance = false;

        //add row for bolt
        var recommendation = null;

        var headspace = ((bolt.tasks - bolt.executors) * 100) / (bolt.tasks);
        headspace = headspace.toFixed(2);


        array = getDesiredNumbers(bolt.executors, bolt.tasks, bolt.capacity);

        newNoOfExecs = array[0];
        newNoOfTasks = array[1];

        if (newNoOfExecs > bolt.executors) {
            recommendation = 'Increase number of executors from current ' + bolt.executors + ' to ' + newNoOfExecs + ' .';
            eligibleForRebalance = true;

        }

        if (newNoOfTasks > bolt.tasks) {
            if (recommendation == null) {
                recommendation = '';
            }

            recommendation = recommendation + ' Increase number of tasks from current ' + bolt.tasks + ' to ' + newNoOfTasks + ' .';
            eligibleForRebalance = false;
        }/* else if(newNoOfTasks < bolt.tasks){
            if(recommendation==null){
                recommendation = '';
            }

            recommendation = recommendation + ' Reduce number of tasks from current ' + bolt.tasks + ' to ' + newNoOfTasks+ ' .';
            eligibleForRebalance = false;
        } */

        if (recommendation) {


            var rowString = '<td>' + bolt.boltId + '</td> <td>' + bolt.capacity + '</td> <td>' + headspace + '</td> <td>' + recommendation + '</td> ';

            if (eligibleForRebalance) {
                showCommand = true;
                boltsToBeRabalanced.push(bolt.boltId + "#" + newNoOfExecs);
            }

            rows.push(rowString);
            tableEmpty = false;
        }
    }

    var header = '<thead class="thead-dark"> <tr> <th>Bolt Id</th> <th>Capacity (last 10m)</th> <th>Headspace (%)</th>';

    if (showCommand) {

        header = header + ' <th> Recommendation <button type="button" class="btn btn-primary rebalanceBtn" data-toggle="modal" data-target="#rebalanceCommandModal"> Rebalance Command</button>  </th>';
        rebalanceCommandGlobal = getRebalanceCommand(topo_name, boltsToBeRabalanced);
    } else {
        header = header + ' <th>Recommendation</th> ';
    }

    header = header + '</tr> </thead>';

    //add table header
    $(tableid_hashed).append(header);

    //add  rows
    for (var i = 0; i < rows.length; i++) {
        $(tableid_hashed).append('<tr style="background-color: #f8f9fa;">' + rows[i] + '</tr>');
    }

    if (tableEmpty) {
        $(tableid_hashed).append('<tr style="background-color: #f8f9fa;"> <td colspan="4"> No Recommendations.</td> </tr>');
    }
}



function getDesiredNumbers(currentNoOfExec, currentNoOfTasks, currentBoltCapacity) {

    if (currentBoltCapacity >= 0.8) {
        //desiredCapacity = 0.7
        executorsIncrRatio = (currentBoltCapacity - 0.7) / currentBoltCapacity;

        newNumberOfExecs = Math.ceil(currentNoOfExec * (1 + executorsIncrRatio));
    } else {
        newNumberOfExecs = currentNoOfExec;
    }

    executorsToTasksRatio = newNumberOfExecs / currentNoOfTasks;

    if (executorsToTasksRatio >= 0.8) {
        //desired executorsToTasksRatio 0.7
        newNoOfTasks = Math.ceil(newNumberOfExecs / 0.7);
    } else {
        if (currentBoltCapacity <= 0.2 && executorsToTasksRatio <= 0.1 && currentNoOfTasks > 1) {
            //reduce no of tasks to bring headspace to 90
            newNoOfTasks = Math.ceil(newNumberOfExecs / 0.1);
        } else {
            newNoOfTasks = currentNoOfTasks;
        }
    }

    var arr = [newNumberOfExecs, newNoOfTasks];
    return arr;

}

function topology_name_click_handler(topology_name) {
    populate_topology_workers(topology_name);
    populate_topology_bolts(topology_name);
}

function storm_worker_click_handler(worker_hostport) {
    if (worker_hostport.includes(":")) {
        hostport_words = worker_hostport.split(":");
        current_host = hostport_words[0];
        current_port = hostport_words[1];
        current_topology_id = document.getElementById("cur_topo").innerText;

        populate_stacktrace(current_topology_id, current_host, current_port);
    } else {
        console.log("malformed worker info in dropdown - ignoring request to populate stacktrace");
    }
}


function refresh_topologies_click_handler() {
    sendGetRequest("/topologies", function () {
        var topolist = JSON.parse(this.response).value;
        topologyDropdownButton.populate_dropdown_with_array(topolist);
    });
}


function populate_topology_workers(topo_id) {

    function worker_select_handler(e) {
        hostport_words = e.target.innerText.split(":");
        current_topology_id = topo_id;
        current_host = hostport_words[0];
        current_port = hostport_words[1];

        populate_stacktrace(topo_id, current_host, current_port);
        unhide_helpers();

    }

    function receive_workers_list() {
        var hostport_array = JSON.parse(this.response).value;

        var i;
        var hostport_labels;

        hostport_labels = [];

        for (i = 0; i < hostport_array.length; i++) {
            var hostport, host, port;

            hostport = hostport_array[i];
            host = hostport.host;
            port = hostport.port;

            hostport_labels.push(host + ":" + port);
        }

        //populate_list_from_array("workers_list", hostport_labels, worker_select_handler);
        stormWorkerDropdownButton.populate_dropdown_with_array(hostport_labels);
    }

    sendGetRequest("/workers", receive_workers_list, "topology_id=" + topo_id);
}

function populate_topology_bolts(topo_id) {

    function receive_bolts_list() {
        var topoNameAndbolts = JSON.parse(this.response).value;

        populate_bolts(topo_id, "bolts_table", topoNameAndbolts);
    }

    sendGetRequest("/bolts", receive_bolts_list, "topology_id=" + topo_id);
}


setInterval(function () {
    if (do_refresh && (null != current_port)) {
        if (time_before_jstack_refresh <= 0) {
            if (pending_refresh_count > 0) {
                stacktraceDisplayUtil.redisplay_earlier_thread();
                stormWorkerDropdownButton.refresh();
                time_before_jstack_refresh = jstack_refresh_interval;
                pending_refresh_count = pending_refresh_count - 1;
            } else {
                var e = document.getElementById("opt");
                do_refresh = false;
                e.innerText = "auto-refresh off";
            }
        } else {
            time_before_jstack_refresh -= REFRESH_TIMER_INTERVAL;
        }
    }
}, REFRESH_TIMER_INTERVAL * 1000);


function set_refresh_options(e) {
    refresh_option = e.target.innerText;

    switch (refresh_option) {
        case "auto-refresh off":
            do_refresh = false;
            pending_refresh_count = 0;
            break;

        case "refresh every 10s":
            do_refresh = true;
            pending_refresh_count = MAX_AUTO_REFRESH_COUNT;
            jstack_refresh_interval = 10;
            break;

        case "refresh every 30s":
            do_refresh = true;
            pending_refresh_count = MAX_AUTO_REFRESH_COUNT;
            jstack_refresh_interval = 30;
            break;

        case "refresh every 1m":
            do_refresh = true;
            pending_refresh_count = MAX_AUTO_REFRESH_COUNT;
            jstack_refresh_interval = 60;
            break;

        case "refresh every 2m":
            do_refresh = true;
            pending_refresh_count = MAX_AUTO_REFRESH_COUNT;
            jstack_refresh_interval = 120;
            break;
    }

    time_before_jstack_refresh = jstack_refresh_interval;

    document.getElementById("opt").innerText = refresh_option;
}


function get_prefix() {
    return document.getElementById("prefix").value;
}

function use_prefix() {

    if (get_prefix().trim() === "") {
        return false;
    } else {
        return true;
    }

}

function populate_stacktrace(topology_id, host, port, expand_thread_id = null) {
    componentid = "#jstack";
    document.body.style.cursor = 'wait'

    receive_jstack = function () {
        var data;
        try {
            data = JSON.parse(this.response);
        } catch (e) {
            console.log(this.response);
        }

        stacktraceDisplayUtil.show_all_threads(data.value, expand_thread_id);
        document.body.style.cursor = 'default'
    }


    if (use_prefix()) {
        query_str = "topology_id=" + topology_id + "&host=" + host + "&port=" + port + "&subst=" + get_prefix();
    } else {
        query_str = "topology_id=" + topology_id + "&host=" + host + "&port=" + port;
    }

    //console.log("sending get request to get the stack trace for: " + host + ":" + port);
    sendGetRequest("/get_remote_worker_stacktrace", receive_jstack, query_str);
}

function sendGetRequest(path, output_handler, query_params = "") {
    var request = new XMLHttpRequest();

    if (query_params == "") {
        path_with_params = path;
    } else {
        path_with_params = path + "?" + query_params;
    }

    request.open("GET", path_with_params);

    request.onload = output_handler;

    request.send();
}
