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
/* A generic class to encapsulate all the functionality 
needed out of a dropdown button. */

/**
 * ip_button_html_id - The unique html element id of this button
 * 
 */
class AppDropdownButton {
    constructor(ip_entity_name, ip_html_div_id, ip_html_button_id, ip_html_valuelist_id, ip_listitem_click_handler, ip_children) {
        //what does this drop down contain ?
        this._entity_name = ip_entity_name;

        //html element id that denotes the enclosing div tag
        this._html_div_id = ip_html_div_id;

        //html element id that denotes the button
        this._html_button_id = ip_html_button_id;

        //html element id that denotes the value list
        this._html_valuelist_id = ip_html_valuelist_id;

        //this function must take the selected list item as input (as a string)
        this._ip_listitem_click_handler = ip_listitem_click_handler;

        var thisAppDropdownButtonObject = this;
        this._listitem_click_handler = function(click_event) {
            var selected_list_item_entry;
            //we will do some stuff before passing control to the user provided handler

            //modify the button text to match the selected list item value value
			selected_list_item_entry = click_event.target.innerText;
            //document.getElementById(thisAppDropdownButtonObject._html_button_id).innerText = selected_list_item_entry;
            thisAppDropdownButtonObject.set_button_text(selected_list_item_entry);

            //call the user provided handler with the selected value
            ip_listitem_click_handler(selected_list_item_entry);
        }

        //set the children 
        if (ip_children != null) {
            this._children = ip_children; 
        } else {
            this._children = [];
        }


        //reset the dropdown
        this.reset();

        //initialize text displayed in the button (is set in set_button_text() method)
        this._active_txt = null;

        //current raw data used by the drop down button
        this._arr = null;
    }

    set_button_text(txt) {
        this._active_txt = txt;
        document.getElementById(this._html_button_id).innerText = txt;
    }

    reset() {
        //console.log("reset() called for " + this._entity_name);

        // clear the dropdown list
        $("#" + this._html_valuelist_id).empty();

        //initialize the button text
        this.set_button_text("Select " + this._entity_name);

        var i;
        var child;
        for (i=0; i<this._children.length; i++) {
            child = this._children[i];
            child.reset();
        }
    }

    populate_dropdown_with_array(arr) {
        this._arr = arr;
        var dropdownid = this._html_valuelist_id;

        //first reset this dropdown
        this.reset();

        // populate the dropdown with values from the array
        var i;
        for (i = 0; i < arr.length; i++) {
            $("#" + dropdownid).append('<li><a class="dropdown-item" href="#"><small>' + arr[i] + '</small></a></li>');
        }

        // attach click event handler on each item in the dropdown
        var item_id_hashed;
        if (null != this._listitem_click_handler) {
            item_id_hashed = "#" + dropdownid + " li";
            $(item_id_hashed).click(this._listitem_click_handler);
        }

        //populate the button with the first item if available and click it :) !
        if (arr.length > 0) {
            this.set_button_text(arr[0]);
            this._ip_listitem_click_handler(arr[0]);
        }

    }

    refresh() {
        //exit early
        if (typeof(this._arr) === "undefined" || this._arr.length == 0) {
            //console.log("this._arr is invalid");
            return;
        }

        if (typeof(this._active_txt) === "undefined" || this._active_txt.trim() === "") {
            //console.log("this._active_txt is invalid: " + this._active_txt);
            return;
        }

        this._ip_listitem_click_handler(this._active_txt);
    }
}