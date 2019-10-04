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
(ns teacup.api
  (:require [clojure.string :as s]
            [teacup.stormutil :as storm]
            [teacup.rpcutil :as rpc]
            [cheshire.core :refer :all]
            [teacup.jstackutil :as js]
            [clojure.tools.logging :as log]))

(defn to-param-list
  [x]
  (s/split x #"&"))


(defn get-val
  [x]
  (nth (s/split x #"=") 1))


(defn query-string-to-map
  [query-string]                                             ; "a=1&b=2&c=3"

  (log/info
   (str
    "query-string: input="
    query-string))
   
  (let [keyval-pairs (s/split query-string #"&")             ; (a=1 b=2 c=3)
        keyvals (map (fn [x] (s/split x #"=")) keyval-pairs) ; ( (a 1) (b 2) (c 3) )
        keys (map (fn [x] (first x)) keyvals)                ; (a b c)
        vals (map (fn [x] (last x)) keyvals)]                ; (1 2 3)
    (zipmap keys vals)))                                     ; {a 1 b 2 c 3}
    

(defn list-java-processes
  [query-string]
  (s/trim (js/output "jps")))

   
(defn get-stack-trace
  [query-string]
  (js/threads-from-pid (get-val query-string)))


(defn get-topologies
  [query-string]
  (storm/get-topologies))


(defn get-workers
  [query-string]
  
  (storm/get-workers
   (get
    (query-string-to-map query-string)
    "topology_id")))


(defn get-bolts
  [query-string]
  
  (storm/get-bolts
   (get
    (query-string-to-map query-string)
    "topology_id")))

(defn do-rebalance
  [query-string requestBody]
  
  (log/debug
   (str
    "inside do-rebalance:"
    query-string))
   
  (def query-map (query-string-to-map query-string))
   
  (storm/do-rebalance
   (get
    query-map
    "topology_id")
  (get
    query-map
    "waitTime")
  requestBody
  ))


;; called from backend
;; e.g. query-string: "topology_id=r1save&port=6700"
(defn get-worker-stacktrace-raw
  [query-string]

  
  (let [param-map (query-string-to-map query-string)
        topology-id (get param-map "topology_id")
        port (get param-map "port")
        worker-pid (storm/get-worker-pid topology-id port)
        subst (s/trim (get param-map "subst" ""))]

    (let [jstack-output (js/threads-from-pid worker-pid)]

      (if
          (= subst "")

        jstack-output

        (filter
         (fn [thread] (js/thread-contains-substring thread subst))
         jstack-output)))))

;; get the worker stacktrace
;; [ [thread1] [thread2] ] --> [ {"thread" [thread1]} {"thread" [thread2]} ]

(defn get-worker-stacktrace
  [query-string]
  (map
   (fn [thread]
     {:thread thread
      :id (js/unique-thread-name thread)
      :hashcode (js/thread-hash thread)
      :threadstate (js/thread-state thread)})
   (get-worker-stacktrace-raw query-string)))

    
(defn remote-get-call
  [host method query-string]

  (let [response (rpc/remote-get
                  host
                  method
                  query-string)]
    (get
     (parse-string
      (:body
       response))
     "value")))


;; called from UI-Javascript
;; e.g. query-string = "topology_id=r1save&host=dc1hdpd1&port=6700"
(defn get-remote-worker-stacktrace
  [query-string]

  (let [param-map (query-string-to-map query-string)
        topology-id (get param-map "topology_id")
        host (get param-map "host")
        port (get param-map "port")]

    (log/debug (str
              "doing remote get @ "
              (. java.lang.System currentTimeMillis)))

    (let [remote-get-output  (remote-get-call
                              host
                              "get_worker_stacktrace"
                              (str
                               "topology_id="
                               topology-id
                               "&port="
                               port))]

      (log/debug
       (str
        "received remote-get-output @ "
        (. java.lang.System currentTimeMillis)))

      remote-get-output)))

