cd ./source/Extension
tar.exe -cvf "../../bin/Extension.zip" *

cd ../../bin
rmdir "data"
cd ../source/Server
robocopy "./data" "../../bin/data" /e

cd ./source/Server
pkg package.json