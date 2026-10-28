const token = localStorage.getItem("casalink_token");

location.replace(token
    ? "/screens/home.html"
    : "/screens/login.html");
