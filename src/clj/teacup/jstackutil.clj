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
(ns teacup.jstackutil
  (:gen-class)
  (:require [clojure.repl :refer :all]
            [clojure.string :as s]
            [clojure.test :as t]
            [clojure.tools.logging :as log]))


;; HTTP functions

(defn handler
  [request]
  {:status 200
   :headers {"Content-Type" "text/html"}
   :body (str "hello " (:remote-addr request) ", how are you ")})

(defn what-is-my-ip
  [request]
  {:status 200
   :headers {"Content-Type" "text/html"}
   :body "nowhere is here!!"})


;; output - to run a shell command and fetch output

(defn getCommandProcessor
  []
  (defn getCommandOutput
    [command]
    (let [process (. (java.lang.Runtime/getRuntime) exec command)]
      (slurp (. process getInputStream))))
  
  (fn [command]
    (getCommandOutput command)))

(defn output
  [command]
  (log/debug
   (str
    "running command ... '"
    command
    "'"))

  (let [command-output ((getCommandProcessor) command)]

    command-output))


(t/deftest test-output
  (t/is (= "1\n" (output "echo 1"))))


(defn in?
  [col mem]
  (some #(= mem %) col))


;; ***************************************************************
;;;;;;;;;; functions related to parsing jstack output ;;;;;;;;;;;;
;; ***************************************************************

(defn is-start-of-new-thread
  [line]
  ;; a new thread is starting if the first character is a " - double quote
  ;; or if it starts with the word Thread
  (cond
    (nil? line) false
    :else (or (= "\"" (subs (s/trim line) 0 1))
              (and (s/starts-with? line "Thread")
                   (not (s/starts-with? line "Threads class SMR"))))))

(defn filter-valid-jstack-lines
  [lines]
  
  (filter
   (complement s/blank?)
   (map
    s/trim
    (s/split
     lines
     #"\n"))))


(defn remove-jstack-header
  [lines]
  
  (cond
    (empty? lines) lines
    :else (if
              (is-start-of-new-thread (first lines))
            lines
            (recur (rest lines)))))
  


(defn group-by-threads
  [lines]
    

  (defn group-by-threads-iter
    [remaining-lines current-output]

    (cond
      (empty? remaining-lines) current-output
      :else (let [this-line (first remaining-lines)]
              (if
                  (is-start-of-new-thread this-line)
                (recur
                 (rest remaining-lines)
                 (concat current-output (list (list this-line))))

                (recur
                 (rest remaining-lines)
                 (concat (drop-last current-output)
                         (list (concat (last current-output)
                                       (list this-line)))))))))

    (group-by-threads-iter
     lines
     (list)))
  

(t/deftest test-group-by-threads
  (t/is (= (list (list "Threads: a")) (group-by-threads (list "Threads: a"))))
  (t/is (= (list (list "Threads: a" "a") (list "Threads: b" "b")) (group-by-threads (list "Threads: a" "a" "Threads: b" "b"))))
  (t/is (= (list) (group-by-threads (list)))))


(defn jstack-dump-to-list
  [jstack-dump]
  (group-by-threads
   (remove-jstack-header
    (filter-valid-jstack-lines
     jstack-dump))))



(defn threads-from-pid                  
  [pid]
  (cond
    (= "" (s/trim pid)) (list)
    :else (let [threads   (seq
                           (jstack-dump-to-list
                            (output (str "jstack " pid))))]
            threads)))

(defn threads-from-file
  [file]
  (jstack-dump-to-list
   (slurp file)))

;; ************************************************
;; Thread related functions
;; ************************************************

(defn thread-group-name
  ;; thread name is enclosed within double quotes
  ;; and occurs in first line for every thread.
  ;; NOTE -- thread's name is not unique and can be shared
  ;; by multiple threads
  [thread]

  (cond
    (empty? thread) ""                  ; empty thread has no signature
    (not= \" (. (first thread) charAt 0)) "" ; this thread has no group name
    :else (let [thread-signature (first thread)
                quote-start-pos 0
                quote-end-pos (s/index-of thread-signature "\"" 1)]
            (if
                (nil? quote-end-pos)    ; signature is missing in the thread, but
              ""                        ; (unlikely since line started with a \"
              (subs thread-signature
                    (inc quote-start-pos)
                    quote-end-pos)))))
    

(defn thread-id
  ;; input: ("line1" "line2" "line3" ... "...")
  ;; thread id is of the form tid=<thread id> and is present in "line1"
  ;; in case no such pattern exists in the input thread,
  ;; or if the input is an empty list,
  ;; return empty string

  [thread]                              
  (cond
    (empty? thread) ""                  ; empty thread has no thread-id
    :else (let [thread-signature (first thread)]
            (try
              (last (re-matches #".*tid=([^\s]*).*" thread-signature))
              (catch Exception e nil)))))

;; return a hopefully unique name
;; for the thread

(defn unique-thread-name
  [thread]
  (let [group-name (thread-group-name thread)
        id (thread-id thread)]
    (str
     group-name
     ":"
     id)))


(defn thread-state
  [thread]
  (def white-space-pattern
    (. java.util.regex.Pattern compile "\\s+"))

  (cond
    (>= (count thread) 2) (let [line-with-state (nth thread 1)]
                            (nth (s/split line-with-state #"\s+") 1))

    ;; some threads just dont have any stack trace
    :else (let [state (s/upper-case (last (s/split (first thread) #"\s+")))]
            (cond
              (= state "CONDITION") "WAITING ON CONDITION"
              :else state))))



(defn thread-contains-substring
  [thread subst]
  (let [subst-ucase (s/upper-case subst)]
    (some
     (fn [x] (s/includes? (s/upper-case x) subst-ucase))
     thread)))


;; ******************************************************************
;; Some utility functions
;; ******************************************************************

(defn split-by-ws
  [x]
  (def white-space-pattern
    (. java.util.regex.Pattern compile "\\s+"))

  (s/split x white-space-pattern))


;; ******************************************************************
;; Threadelement & call related functions
;; ******************************************************************

(defn elements
  [thread]
  ;; line 1 - thread signature
  ;; line 2 - thread state
  ;; lines >= 3 - thread body
  ;; thread body is composed of thread elements
  (drop 2 thread))


(defn element-type
  [thread-element]
  (cond
    (s/starts-with? thread-element "- waiting on") "waiting_on_lock"
    (s/starts-with? thread-element "- locked") "locked"
    (s/starts-with? thread-element "- parking") "parking"
    :else "call"))

(defn is-call?
  [element]
  (= (element-type element) "call"))

(defn src-loc
  [elm]
  (subs elm
        (inc (s/index-of elm "("))
        (s/index-of elm ")")))

(defn src-fn
  [elm]
  (subs elm
        (inc (s/index-of elm " "))
        (s/index-of elm "(")))



(defn known-source?
  [el]

  (not
   (in? (list "native method" "unknown source" "<generated>") (s/lower-case (src-loc el)))))


(defn elements-with-source
  [threads]
  (filter
   known-source?
   (filter
    is-call?
    (reduce
     concat
      (map
       elements
       threads)))))


(defn get-call-info
  
  [call]

  (defn get-call-function
    [el]
    (let [tmp (first (rest (split-by-ws el)))]
      (subs tmp
            0
            (s/index-of tmp "("))))

  (defn get-call-source
    [call]

    (subs call
          (inc (s/index-of call "("))
          (s/index-of call ")")))
  
  (assert (known-source? call))

  (cond
    (empty? call) (list)
    :else (list (get-call-function call)
                (get-call-source call))))


(defn jstack-from-pid
  [pid]
  {"lines"  (s/split (s/trim
                      (output (str "jstack " pid)))
                     #"\n")})


;; generate a unique hashcode for the thread
;; we generate the hash code for the thread contents only
;; i.e. we do not consider the thread signature and thread state
;; which are the first two entries in the thread

(defn thread-hash
  [thread]
  (hash
   (elements thread)))


