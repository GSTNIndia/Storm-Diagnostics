#!/bin/bash

java -Ddatabase-url="jdbc:h2:./storm.db" -Dconf=myconfig.edn -jar teacup.jar
