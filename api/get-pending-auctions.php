<?php
header("Content-Type: application/json");
require_once "../config/db.php";
session_start();

if(!isset($_SESSION['user_id']) || !isset($_SESSION['user_role'])){
    echo json_encode(["status"=>"error","message"=>"not authorized"]);
    exit;
}

$role = $_SESSION['user_role'];
if($role !== 'admin' && $role !== 'employee'){
    echo json_encode(["status"=>"error","message"=>"insufficient privileges"]);
    exit;
}

$sql = "SELECT * FROM auctions WHERE status='pending' ORDER BY created_at DESC";
$res = mysqli_query($conn, $sql);
$out = [];
while($row = mysqli_fetch_assoc($res)){
    $id = $row['id'];
    $imgs = [];
    $imgSql = "SELECT file_path FROM auction_images WHERE auction_id = '$id'";
    $imgRes = @mysqli_query($conn, $imgSql);
    if($imgRes){
        while($ir = mysqli_fetch_assoc($imgRes)) $imgs[] = $ir['file_path'];
    }
    $row['images'] = $imgs;
    $out[] = $row;
}

echo json_encode(["status"=>"success","data"=>$out]);
?>
