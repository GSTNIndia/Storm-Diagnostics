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
class StacktraceDisplayUtil {
	constructor(ip_threadcontent_display_id, ip_prefix_id, ip_thread_table) {
		//html element that displays a thread's stack trace
		this._threadcontent_display_id = ip_threadcontent_display_id;

		//html element (text area) that stores the application name to be used for filtering (optional)
		this._prefix_id = ip_prefix_id;

		//html element that is used as dataTable
		this._thread_table = ip_thread_table;

		//create the data table
		this._datatable = $("#" + ip_thread_table).DataTable();

		//create below two variables so that they will be part of callback's closure
		var _datatable = this._datatable;
		var stacktrace_display_util = this;

		//set a callback on the table for row click event
		$('#' + this._thread_table + " tbody").on('click', 'tr', function () {
			var data = _datatable.row(this).data();
			var thread_id = data[0];
			stacktrace_display_util._active_thread_id = thread_id;
			stacktrace_display_util.display_thread_content();
		});


		//the current active thread id (actual value set in callback set for each thread-id's click event)
		this._active_thread_id = null;

		this._redisplay_earlier_thread = false;
	};

	get_displayed_thread_id() {
		return this._active_thread_id;
	}


	// check if any of the thread elements contains the input \
	// string as a substring
	thread_contains_substring(ip_thread_id, subst) {
		var contains_subst = false;
		var i;

		var ip_thread_content;
		//console.log("checking thread id" + ip_thread_id + " for subst = " + subst);
		if (this._threadId_threadContent_map.has(ip_thread_id)) {
			ip_thread_content = this._threadId_threadContent_map.get(ip_thread_id).thread;
			//console.log("array content = " + ip_thread_content);
			//console.log("array length = " + ip_thread_content.length);
			for (i = 0; i < ip_thread_content.length; i++) {
				var val = ip_thread_content[i];
				//console.log("current line checked: " + val);

				if (val.indexOf(subst) != -1) {
					//console.log("subst FOUND");
					contains_subst = true;
					break;
				}
			}
		} else {
			//console.log("input thread id not present in map. map = TBD ");
		}

		return contains_subst;
	}

	display_thread_content() {
		var thread_content;
		var col = "black";
		var tag_prefix = '<span style="color:' + col + '">';
		var tag_suffix = '</span><br>';
		var i;
		var thread_id;

		//use the thread-id that is stored as object attribute
		thread_id = this._active_thread_id;

		var thread_content;
		if (this._threadId_threadContent_map.has(thread_id)) {

			thread_content = this._threadId_threadContent_map.get(thread_id).thread;
			//console.log("clearing the threads from function: display_thread_content");
			$("#" + this._threadcontent_display_id).empty();

			//display each line in the thread content
			for (i = 0; i < thread_content.length; i++) {
				var html_tag;

				html_tag = tag_prefix + thread_content[i] + tag_suffix;
				if (use_prefix()) {
					if (thread_content[i].includes(get_prefix())) {
						html_tag = tag_prefix + "<mark>" + thread_content[i] + "</mark>" +  tag_suffix;
					}
				}

				$("#" + this._threadcontent_display_id).append(html_tag);
			}
		} else {
			//console.log("Thread id not present in map: " + thread_id);
		}
	}

	display_thread_id(thread_id) {
		var thread_state, thread_type;
		thread_state = this._threadId_threadContent_map.get(thread_id).threadstate;

		if (this._redisplay_earlier_thread) {
			if ( ! (this._earlier_threadId_threadContent_map.has(thread_id)) ) {
				thread_type = "New thread";
			} else if ( ! (this._earlier_threadId_threadContent_map.get(thread_id).hashcode === this._threadId_threadContent_map.get(thread_id).hashcode) ) {
				thread_type = "Thread has changed";
			} else {
				thread_type = "Stationary?";
			}
		} else {
			thread_type = "";
		}

		this._datatable.row.add([thread_id, thread_state, thread_type]).draw();
	}

	reset_display() {
		$("#" + this._threadcontent_display_id).empty();
		$("#" + this._thread_table).DataTable().clear().draw();
	}

	reset() {
		//console.log("stacktrace is cleared in reset() function");
		//var err = Error();
		//console.log(err.stack);
		// clear the state
		this.reset_display();

		//save the earlier thread map, if a redisplay is in progress
		if (this._redisplay_earlier_thread) {
			//FIXME - give a better variable name
			this._earlier_threadId_threadContent_map = undefined;
			this._earlier_threadId_threadContent_map = new Map(this._threadId_threadContent_map);
		}
		this._threadId_threadContent_map = undefined;
	}

	initialize(ip_all_threads) {
		this.reset();


		this._all_threads = ip_all_threads

		//refresh the map
		this.refresh_threadId_threadContent_map();
	}

	thread_dump_as_string() {
		if ( ! (this._all_threads) ) {
			return "";
		}

		var i;
		var output = "";
		for (i=0; i<this._all_threads.length; i++) {
			var this_thread = this._all_threads[i].thread;

			var j;
			for (j=0; j<this_thread.length; j++) {
				output = output + this_thread[j] + "\n";
			}

			output = output + "\n";
		}

		return output;
	}

	refresh_threadId_threadContent_map() {


		this._threadId_threadContent_map = new Map();

		var i;
		for (i = 0; i < this._all_threads.length; i++) {
			var thread_id, thread_content;

			thread_id = this._all_threads[i].id;
			thread_content = this._all_threads[i];
			this._threadId_threadContent_map.set(thread_id, thread_content);
		}
	}

	redisplay_earlier_thread() {
		this._redisplay_earlier_thread = true;
	}

	paint() {
		var type = 0;
		var threads_to_display;
		var show_this_thread;

		threads_to_display = this._all_threads;

		//console.log("********************************");
		//console.log("received new set of threads with count = " + ip_all_threads.length);

		this.reset_display();

		var i;
		//console.log("paint: will check for prefix = " + get_prefix());
		for (i = 0; i < threads_to_display.length; i++) {
			var this_thread_content, this_thread_id, this_thread_hash;

			this_thread_content = threads_to_display[i].thread;
			this_thread_id = threads_to_display[i].id;
			this_thread_hash = threads_to_display[i].hashcode;

			show_this_thread = false;

			if (use_prefix()) {
				//console.log("prefix to be checked:" + get_prefix() + " for thread id:" + this_thread_id);
				if (this.thread_contains_substring(this_thread_id, get_prefix())) {
					show_this_thread = true;
				}
			} else {
				show_this_thread = true;
			}

			if (show_this_thread) {
				var col;
				type = 1 - type;

				if (type == 0) {
					col = "blue";
				} else {
					col = "green";
				}
				//console.log("Adding a thread_id for display in the data table: " + this_thread_id);
				this.display_thread_id(this_thread_id);
			}
		}

		var display_earlier_thread = false;
		if (this._redisplay_earlier_thread) {
			//console.log("displaying older thread id: " + this._active_thread_id);
			if (use_prefix()) {
				//console.log("use prefix is set to true. Prefix=" + get_prefix());
				if (this.thread_contains_substring(this._active_thread_id, get_prefix())) {
					//console.log("thread contains prefix: " + this._active_thread_id)
					display_earlier_thread = true;
				} else {
					//console.log("thread does NOT contain prefix: " + this._active_thread_id);
				}

			} else {
				//console.log("use prefix is set to false");
				display_earlier_thread = true;
			}
		}

		if (display_earlier_thread) {
			this.display_thread_content();
			this._redisplay_earlier_thread = false;
		}

	}

	show_all_threads(ip_all_threads, expand_thread_id = null) {
		this.initialize(ip_all_threads);

		this.paint();

	}
}
