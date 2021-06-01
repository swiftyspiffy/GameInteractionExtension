function showInfoDialog(title, description) {
    $('#modal-info-title').html(title);
    $('#modal-info-description').html(description);
    $('#modal-info').modal("show");
}

function closeInfoDialog() {
    $('#modal-info').modal("hide");
}