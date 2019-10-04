;-------------------------------------------------------------------------------
; Copyright 2019 Goods And Services Tax Network
; 
; Licensed under the Apache License, Version 2.0 (the "License"); you may not
; use this file except in compliance with the License.  You may obtain a copy
; of the License at
; 
;   http://www.apache.org/licenses/LICENSE-2.0
; 
; Unless required by applicable law or agreed to in writing, software
; distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
; WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
; License for the specific language governing permissions and limitations under
; the License.
;-------------------------------------------------------------------------------
(ns teacup.env
  (:require [selmer.parser :as parser]
            [clojure.tools.logging :as log]
            [teacup.dev-middleware :refer [wrap-dev]]))

(def defaults
  {:init
   (fn []
     (parser/cache-off!)
     (log/info "\n-=[teacup started successfully using the development profile]=-"))
   :stop
   (fn []
     (log/info "\n-=[teacup has shut down successfully]=-"))
   :middleware wrap-dev})
