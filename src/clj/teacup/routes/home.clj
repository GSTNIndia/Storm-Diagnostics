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
(ns teacup.routes.home
  (:require [teacup.layout :as layout]
            [teacup.db.core :as db]
            [teacup.api :as api]
            [ring.util.http-response :refer [ok]]            
            [compojure.core :refer [defroutes GET POST]]
            [cheshire.core :refer :all]
            [ring.util.http-response :as response]
            [clojure.java.io :as io]
            [clojure.tools.logging :as log]))

(defn home-page [request]
  (layout/render request "home.html" {:docs (-> "docs/docs.md" io/resource slurp)}))

(defn about-page [request]
  (layout/render request "about.html"))

(defn inspect-page [request]
  (layout/render request "inspect.html"))


(defn call-rest-api [api request]

  
  (defn get-api-fn
    [api]
    (cond
      (= "topologies" api) api/get-topologies
      (= "workers" api) api/get-workers
      (= "bolts" api) api/get-bolts
      (= "get_worker_stacktrace" api) api/get-worker-stacktrace
      (= "get_remote_worker_stacktrace" api) api/get-remote-worker-stacktrace
      (= "rebalance" api) api/do-rebalance
      ))


  (let [output (generate-string
                {:value ((get-api-fn api)
                         (:query-string request))})]
    (ok output)))


(defn call-rest-api-post [api request]

  (log/info
   (str
    "\n"
    "inside call-rest-api-post for api:"
    api))
    ; ",request:"                         
    ; request))
  
  (defn get-api-fn
    [api]
    (cond
      (= "rebalance" api) api/do-rebalance
      ))


  (let [output (generate-string
                {:value ((get-api-fn api)
                         (:query-string request)
                         (:body request))})]
    (ok output)))


(defroutes home-routes
  ( GET "/" request (home-page request))
  (GET "/about" request (about-page request))
  (GET "/inspect" request (inspect-page request))
  (GET "/topologies" request (call-rest-api "topologies" request))
  (GET "/workers" request (call-rest-api "workers" request))
  (GET "/bolts" request (call-rest-api "bolts" request))
  (GET "/get_worker_stacktrace" request (call-rest-api "get_worker_stacktrace" request))
  (GET "/get_remote_worker_stacktrace" request (call-rest-api "get_remote_worker_stacktrace" request)))


;  (POST "/rebalance" request (call-rest-api "rebalance" request)) 
;  )


