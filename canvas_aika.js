function connect_aika(username, password, device_number) {
  // Implement Aika connection logic here. This is just a placeholder.
  // The return value would be the location data.
  return `Mock GPS Data - User ${username}, Device ${device_number}`;
}

function display_form() {
  let html = `
    <h1>AIKA Connection Settings</h1>
    <p>Please enter AIKA GPS credentials</p>
    <div>
        Username: <input type='text' id='aika_username' value='${document.getElementById('aika_username').value || ''}'><br/>
        Password: <input type='password' id='aika_password' value='${document.getElementById('aika_password').value || ''}'><br/>
        Device Number: <input type='text' id='aika_device_number' value='${document.getElementById('aika_device_number').value || ''}'><br/>
        <button onclick='test_connection()'>Test Connection</button>
    </div>
    <div id='status'></div>
  `;
  document.body.innerHTML = html;


}

function test_connection(){
    let username = document.getElementById('aika_username').value;
    let password = document.getElementById('aika_password').value;
    let device_number = document.getElementById('aika_device_number').value;

    let result = connect_aika(username, password, device_number);
    document.getElementById('status').innerText = result;  // set Status in Displayed Form


    let res =   get_mock(); // set something to output and return
    return res


}

function get_mock() {
  return  'AIKA Connect Tester Ready';
}
display_form();