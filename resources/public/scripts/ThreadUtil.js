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
class StormThread {

    constructor(ip_thread, thread_id, thread_hash) {
	//array of thread elements (each of type string)
	this._thread = ip_thread;

	//unique id associated with the thread
	//<thread group name>:<tid>
	this._id = thread_id;

	//hashcode of a thread
	//used to check if a thread is stuck for a long time
	this._hash = thread_hash;
    }

    get id() {
	return this._id;
    }

    set id(newid) {
	this._id = newid;
    }

    // check if any of the thread elements contains the input \
    // string as a substring
    contains(subst) {
	var contains_subst = false;
	var i;
	
	for (i=0; i<this._thread.length; i++) {
	    var val = this._thread[i];

	    if (val.indexOf(subst) != -1) {
		contains_subst = true;
		break;
	    }
	}

	return contains_subst;
    }
    
    
}
    
