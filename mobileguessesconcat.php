<?php
header("Access-Control-Allow-Origin: *");
$out = "<guessSnowball>";
foreach (glob("data/mobile*.xml") as $filename) {
	$in = fopen($filename, "r");
	while ($line = fgets($in)) {
		$out = $out . $line;
	}
	fclose($in);
}
$out = $out . "</guessSnowball>";
echo($out);
?>