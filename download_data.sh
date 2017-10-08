for i in $(
              curl -s https://archive.org/details/stackexchange |
                  grep "download/stackexchange.*7z" |
                  awk -F '"' '{print "https://archive.org"$4}'
          );
do
    echo $i
    wget $i -q --show-progress
done
