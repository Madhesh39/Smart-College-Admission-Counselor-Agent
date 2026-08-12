#!/bin/bash
cp /usr/bin/node-22 ./my_node
chmod +x ./my_node
./my_node --version > node_out.txt 2> node_err.txt
