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
(ns teacup.stormutil
  (:require [clj-http.client :as client]
            [cheshire.core :refer :all]
            [teacup.config :refer [env]]
            [clojure.tools.logging :as log]))


(def action-url-map
  {
   "cluster-config" "/cluster/configuration"
   "topology-summary" "/topology/summary"
   "get-workers" "/topology-workers"
   "get-bolts" "/topology"
   "rebalance" "/topology"})

(defn get-worker-base-path
  []
  (str
   (:storm-log-dir env)
   "/workers-artifacts"))


(defn get-worker-pid
  [topology-id port]

  (defn get-worker-exception-handler
    [e]
    (log/error
     (str
      "exception when reading from pid file: "
      e))

    "")
  
  (defn get-worker-pid-file-path
    []
    (str (get-worker-base-path)
         "/"
         topology-id
         "/"
         port
         "/worker.pid"))

  (try
    (slurp (get-worker-pid-file-path))
    (catch Exception e (get-worker-exception-handler e))))


(defn get-url-base
  []
  (log/debug
   (str
    "reading url base :"
    (:port env)))
  
  (str
   "http://"
   (:storm-ui-ip env)
   ":"
   (:storm-ui-port env)
   "/api/v1"))

(defn cluster-config-url
  []
  (str (get-url-base)
       "/cluster/configuration"))

(defn do-get
  [url]
  (client/get url))


(defn do-post
  [url body]
  (client/post url
             {:body body
              :content-type :json
              })
  )

(defn rebalance
  [url executorsJsonString]
  (do-post url executorsJsonString
    )
  )

(defn do-action
  [action]
  (do-get (str (get-url-base)
               (get action-url-map action))))

(defn get-cluster-summary
  []
  (do-action "cluster-config"))

(defn get-topology-summary
  []
  (do-action "topology-summary"))

(defn get-topologies
  []
  (map
   (fn [x] (get x "id"))
   (get (parse-string (:body (get-topology-summary))) "topologies")))


(defn get-workers
  [topology-id]

  (get
   (parse-string
    (:body
     (do-get
      (str (get-url-base)
           (get
            action-url-map
            "get-workers")
           "/"
           topology-id))))
   "hostPortList"))


(defn get-bolts
  [topology-id]

  
   (def topoInfoMap (parse-string
    (:body
     (do-get
      (str (get-url-base)
           (get
            action-url-map
            "get-bolts")
           "/"
           topology-id)))))
   
   (generate-string(select-keys topoInfoMap ["name" "bolts"]))
   
  )

(defn do-rebalance
  [topology-id waitTime rebalanceOptionsJson]
  (log/info "inside stormutil/do-rebalance")

  
   (parse-string
    (:body
     (do-post
      (str (get-url-base)
           (get
            action-url-map
            "rebalance")
           "/"
           topology-id
       "/"
       "rebalance"
       "/"
       waitTime)
      rebalanceOptionsJson)))
 )


