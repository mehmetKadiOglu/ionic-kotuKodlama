import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController, List } from 'ionic-angular';
import { TextToSpeech } from '@ionic-native/text-to-speech';
import * as $ from 'jquery'
import { Geolocation, Geoposition } from '@ionic-native/geolocation';
import { LocationAccuracy } from '@ionic-native/location-accuracy';
declare const google;

@Component({
    selector: 'page-home',
    templateUrl: 'home.html'
})
export class HomePage {
    @ViewChild('map') mapElement: ElementRef;
    @ViewChild('directionsPanel') directionsPanel: ElementRef;  // rota bilgisinin dolduğu div


    constructor(public navCtrl: NavController, private locationAccury: LocationAccuracy, private geo: Geolocation) {

    }

    SayfaIslem: sayfaIslem;
    YerServisi: yerServisi;
    MapIslem: mapIslem;

    ionViewDidLoad() { // uygulama calışırken otomatik olarak ilk bu fonksiyon çalıştırılır

        this.locationAccury.canRequest().then((canRequest: boolean) => {
            if (canRequest) {
                this.locationAccury.request(this.locationAccury.REQUEST_PRIORITY_HIGH_ACCURACY)
                    .then(() => { alert("lokasyon acıldı.") })
                    .catch((e) => { alert("problem var" + e.message) })
            }
        });

        this.SayfaIslem = new sayfaIslem();
        this.YerServisi = new yerServisi();

        this.MapIslem = new mapIslem(this.directionsPanel, this.mapElement);

        this.SayfaIslem.gizle(0); // tüm elemanlar ilk olarak gizleniyor.

        this.YerServisi.mapSet(this.MapIslem.mapGet());
        this.YerServisi.setNesne(this.SayfaIslem);
        this.SayfaIslem.mapSet(this.MapIslem.mapGet());

         alert("Başlangıc adresi olarak konum almak için konumu işaretleyiniz");

    }

    haritaBaslat(a) {

        if (a == 2000) {// fab ikon ana düğmesi.
            this.SayfaIslem.gizle(a);
            this.SayfaIslem.goster(5, this.YerServisi);
            this.YerServisi.clearMarkers();
        }
        else if (a >= 1 && a <= 4) { // 1 asa divi, 2 yan divi, 3 asa divindeki 2. text click için, 4 rota text divi

            this.SayfaIslem.goster(a, this.YerServisi);
        }

        else if (a == "konum") { //guncelle düğmesine basıldığında

            this.SayfaIslem.guncelleKonum(this.MapIslem);
        }

        else if (a == "WALKING" || a == "DRIVING") { // asa divindeki butonlar

            this.SayfaIslem.rotaBaslangicSet();
            this.SayfaIslem.bitisSet();

            this.MapIslem.setSeyahatTuru(a);
            this.MapIslem.baslangicSet(this.SayfaIslem.baslangicGet());
            this.MapIslem.bitisSet(this.SayfaIslem.bitisGet());
            this.MapIslem.navigasyonBasla(true);
        }
        else if (a == "dinle") { // dinleme butonu

            $("#mikrofon").css("display", "none");
            $("#mikrofon2").css("display", "block");
            this.MapIslem.intervalDurdur();
        }

        else if (a == "sesKes") { // dinlemeyi durdurma butonu
            $("#mikrofon").css("display", "block");
            $("#mikrofon2").css("display", "none");
            this.MapIslem.setİndex();
        }

        else if (a == "Temizle1" || a == "Temizle2" || a == "Temizle3") { // inputlara çift tıklandığında silinmesi için
            this.SayfaIslem.textboxTemizle(a[7]);
        }

        else if (a == "yerBul") { // yan divdeki button
            this.YerServisi.yerBul();
        }

        else if (a == "yerRota") {  // Konum çeresindeki kafe vs bulma işlemi. markerAyrinti butonu tarafından tetiklenir.
            //yer rota başlangıcı ayrı olması gerek? Ana başlangıcı alıyo
            this.YerServisi.gosterKontrolSet();

            this.SayfaIslem.yerBaslangicSet();

            this.MapIslem.baslangicSet(this.SayfaIslem.baslangicGet());
            this.MapIslem.bitisSet(this.YerServisi.rotaKordinatGet());

            this.SayfaIslem.goster(5, this.YerServisi); // goster fonksiyonu sayfadaki divlerin buttonların kapanıp acılmasını ayarlar.
            this.MapIslem.navigasyonBasla(true);
        }
    }
}
export class sayfaIslem {
    private watchPositionId; // konum takibinin durması için
    private konum = false; // konumun acılıp acılmadığını kontrol etmek için
    private asaKontrol = false;  // name="car" iconunun içinde bulunduran buttona click - unclick kontrolu
    private yanKontrol = false; //  name="map" iconunu içinde bulunduran buttona click - unclick kontrolu
    private map: any; // google mapsta kullanılmak için oluşturulmuş değişken.
    private konumMarker; // konumu gösteren marker
    private baslangic: string; // inputlar tarafından girilen baslangıc değeri
    private baslangic2: string; // konum acıldığında classın bu özelliğine sürekli mevcut konum atanır.
    private bitis: string; // inputlar tarafından girilen bitiş değerleri
    private geo = new Geolocation(); // konum takip etme işleminde kullanılacak özellik


    rotaBaslangicSet() {

        let THIS = this;

        if (!THIS.konum) {
            THIS.baslangic = $("#pac-input").val().toString();

        }

    }

    yerBaslangicSet() {
        let THIS = this;

        if (!THIS.konum) { // konum acıksa otomatik baslangıc alınıyor

            THIS.baslangic = $("#pac-input3").val().toString();
        }
    }

    bitisSet() {

        this.bitis = $("#pac-input2").val().toString();
    }

    mapSet(map) {
        this.map = map;
    }

    baslangicGet() {

        if (this.konum)
            return this.baslangic2;
        else
            return this.baslangic;
    }

    bitisGet() {
        return this.bitis;
    }

    konumGet() { //konum booleden özelliğini döndürür
        return this.konum;
    }

    private konumGetir(text) {//o anki konumun kordinatlarını alır
        let THIS = this;
        let geocoder = new google.maps.Geocoder();
        let location;

        let options = {
            enableHighAccuracy: true
        };

        if(this.konumGet())
        {
            geocoder.geocode({ 'address': this.baslangicGet() }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    this.returnAdres = results[0].formatted_address;
                    if (text == 1) {
                        $("#pac-input").val(this.returnAdres);
                    }
                    else {
                        $("#pac-input3").val(this.returnAdres);
                    }

                } else {
                    //result = "Unable to find address: " + status;
                    console.log("hi yankee!");
                }
            });
        }
        else
        THIS.geo.getCurrentPosition(options).then(pos => {
            if (pos.coords !== undefined) {
                location = pos.coords.latitude + ', ' + pos.coords.longitude;
            }
            geocoder.geocode({ 'address': location }, function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    this.returnAdres = results[0].formatted_address;

                    if (text == 1) {
                        $("#pac-input").val(this.returnAdres);
                    }
                    else {
                        $("#pac-input3").val(this.returnAdres);
                    }

                } else {
                    //result = "Unable to find address: " + status;
                    console.log("hi yankee!");
                }
            });
        });

    }

    goster(a, nesne: yerServisi) { // sistemde yer alan divlerin buttonların kapanıp acılması
        let THIS = this;

        switch (a) {
            case 1:     ///////////// yan divi işlemi
                $("div#yan").show(2000);
                if (!this.yanKontrol) {
                    THIS.konumGetir(2);
                    this.yanKontrol = true;

                }

                else {
                    nesne.clearMarkers();
                    this.yanKontrol = false;
                    $("div#yan").hide(2000);

                    this.goster(5, nesne); // marker ayrıntılarını gösteren spanların kapanması için
                    this.textboxTemizle(3);
                }
                break;
            case 2: ///////////// asa divi işlemi
                {
                    $("div#asa").show(2000);
                    if (!this.asaKontrol) {
                        this.asaKontrol = true;
                        THIS.konumGetir(1);
                    }

                    else {
                        this.asaKontrol = false; // unclick olayında asa divi gizlenirken textleri boşaltılır.
                        $("div#asa,div#buttonlar").hide(2000);
                        // $("div#buttonlar").hide(2000);
                        this.textboxTemizle(1);
                        this.textboxTemizle(2);

                    }
                    break;
                }

            case 3:
                $("div#buttonlar").show(2000); // bitiş konumu textite basıldığında rota butonlara görünür
                break;

            case 4:
                {
                    if ($("#directionsPanel").css("left").toString() == "-600px") {
                        $("#directionsPanel").animate({ left: '0px' }, "slow");
                    }
                    else {

                        $("#directionsPanel").animate({ left: '-600px' }, "slow");
                    }

                    break;
                }

            case 5:
                {
                    if ($("#markerAyrinti").css("left").toString() == "-600px") {
                        if (this.yanKontrol) // ion-card kapama tuşuna basıldığında yan divi acılmışsa marker ayrıntı acılsın
                            $("#markerAyrinti").animate({ left: '0px' }, "slow");
                    }
                    else {

                        $("#markerAyrinti").animate({ left: '-600px' }, "slow");
                        $("#yerIsmi").text("");
                        $("#telefonNumarasi").text("");
                    }

                    break;
                }
            default:
                break;
        }

    }

    gizle(a) { // sistemde yer alan textleri temizleyip, tüm divleri ve butonları kapatır

        $("div#asa,div#yan,div#buttonlar").hide(a);

        this.yanKontrol = false;
        this.asaKontrol = false;

        this.textboxTemizle(1);
        this.textboxTemizle(2);
        this.textboxTemizle(3);

    }

    private konumTakipEtmeyiBaslat() { // konum butonuna basıldığında guncelleKonum fonksiyonu tarafından tetiklenir. Sürekli mevcut konumu cekerek baslangic2 özelliğine atar ve haritada yerimizi gösterir

        let THIS = this;

        let options = {
            enableHighAccuracy: true
        };

        var image = {
            url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
            // url: "assets/icon/icons.png",
            // This marker is 20 pixels wide by 32 pixels high.
            size: new google.maps.Size(20, 32),
            // The origin for this image is (0, 0).
            origin: new google.maps.Point(0, 0),
            // The anchor for this image is the base of the flagpole at (0, 32).
            anchor: new google.maps.Point(0, 32)
        };

        // THIS.interval2 = setInterval(function () {

        //     THIS.geo.getCurrentPosition(options).then(pos => {
        //         if (pos.coords !== undefined) {
        //             let location = { lat: +pos.coords.latitude, lng: +pos.coords.longitude };

        //             if (THIS.konumMarker) {
        //                 THIS.konumMarker.setMap(null);
        //             }
        //             THIS.baslangic2 = pos.coords.latitude.toString() + ',' + pos.coords.longitude.toString();
        //             THIS.konumMarker = new google.maps.Marker({ position: location, map: THIS.map, icon: image, label: 'HERE' });
        //             THIS.map.setCenter(location);
        //         }

        //     });

        // }, 1000); 

        this.watchPositionId = this.geo.watchPosition(options).subscribe(pos => {

            if (pos.coords !== undefined) {
                let location = { lat: +pos.coords.latitude, lng: +pos.coords.longitude };
                if (this.konumMarker) {
                    this.konumMarker.setMap(null); // üst üste marker binmemesi için
                }
                this.baslangic2 = pos.coords.latitude.toString() + ',' + pos.coords.longitude.toString();
                if (this.konum) {
                    this.konumMarker = new google.maps.Marker({ position: location, map: this.map, icon: image, label: 'HERE' });

                }
                THIS.map.setCenter(location);
            }

        });
    }

    guncelleKonum(nesne: mapIslem) { //konum butonuna basıldığında tetiklenir.

        let THIS = this;

        if (!THIS.konum) {
            THIS.konum = true;
            nesne.konumSet(THIS.konum);
            THIS.konumTakipEtmeyiBaslat();
        }
        else {

            THIS.watchPositionId.unsubscribe();
            THIS.konum = false;

            nesne.konumSet(THIS.konum);

            nesne.kalanMesafeKontrol(); // yaklaşında uyarı sisteminin kapanması için

            setTimeout(() => {
                THIS.konumMarker.setMap(null);
            }, 1200);
        }

    }

    textboxTemizle(a) { //textleri temizler

        if (a == "1")
            $("#pac-input").val("");
        else if (a == "2")
            $("#pac-input2").val("");
        else
            $("#pac-input3").val("");
    }


}

export class yerServisi {


    private gosterKontrol = 0;  // markere tıklandığında detay divi acılması için. bu şartı koymaz isek basışımıza kapanıp acılacak
    private sayfaIslemNesne;
    private map; //uygulamadaki map divi
    private places; // Markerların cıktığı yerler için
    private markers = []; // Belirtilen konum cevresinde aranan yerlerin gösterilmesinde cıkan markerleri tutan dizi
    private MARKER_PATH = 'https://developers.google.com/maps/documentation/javascript/images/marker_green';// marker ikon için
    private rotaKordinat; // Tıklanan markerin kordinatı, tıklandığında otomatik 
    constructor() {


    }
    gosterKontrolSet() {
        this.gosterKontrol = 0;
    }

    mapSet(map) {

        this.map = map;
    }
    setNesne(sayfaIslemNesne: sayfaIslem) {
        this.sayfaIslemNesne = sayfaIslemNesne;
    }

    rotaKordinatGet() {
        let THIS = this;
        return THIS.rotaKordinat;
    }

    yerBul() {
        let address = $("#pac-input3").val();
        this.getLatLong(address);
    }

    private getLatLong(address) {
        let THIS = this;
        let geocoder = new google.maps.Geocoder();
 
        geocoder.geocode({ 'address': address }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                let latLng = new google.maps.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng());
                THIS.map.panTo(latLng);
                THIS.map.setZoom(15);
                THIS.search(); //arama fonksyionu cağrılıy
            } else {
            }
        });
    }


    private search() {

        let tur = $("#turler").val();
        let THIS = this;
        var search = {
            bounds: this.map.getBounds(),
            types: [tur] // arama tipleri
        };
        THIS.places = new google.maps.places.PlacesService(THIS.map);
        THIS.places.nearbySearch(search, function (results, status) {
            if (status === google.maps.places.PlacesServiceStatus.OK) {

                THIS.clearMarkers();

                for (var i = 0; i < results.length; i++) {

                    var markerLetter = String.fromCharCode('A'.charCodeAt(0) + (i % 26));
                    var markerIcon = THIS.MARKER_PATH + markerLetter + '.png';
                    // Use marker animation to drop the icons incrementally on the map.
                    THIS.markers[i] = new google.maps.Marker({
                        position: results[i].geometry.location,
                        animation: google.maps.Animation.DROP,
                        icon: markerIcon
                    });
                    // If the user clicks a hotel marker, show the details of that hotel
                    // in an info window.
                    THIS.markers[i].placeResult = results[i];

                    google.maps.event.addListener(THIS.markers[i], 'click', function () {
                        var marker = this;
                        THIS.showInfoWindow(marker);

                    });
                    setTimeout(THIS.dropMarker(i), i * 100);
                }
            }
        });
    }

    clearMarkers() {
        for (var i = 0; i < this.markers.length; i++) {
            if (this.markers[i]) {
                this.markers[i].setMap(null);
            }
        }
        this.markers = [];
    }

    private dropMarker(i) {
        let THIS = this;
        return function () {
            THIS.markers[i].setMap(THIS.map);
        };

    }

    private showInfoWindow(marker) {
        let THIS = this;

        //THIS.infoWindow = new google.maps.InfoWindow();

        THIS.places.getDetails({ placeId: marker.placeResult.place_id },
            function (place, status) {
                if (status !== google.maps.places.PlacesServiceStatus.OK) {
                    return;
                }
                if (place.formatted_phone_number) {

                    $("#yerIsmi").text("Yer ismi = " + place.name);
                    $("#telefonNumarasi").text("Telefon Numarası = " + place.formatted_phone_number);
                    THIS.rotaKordinat = place.geometry.location.lat() + "," + place.geometry.location.lng();

                    // metin = '<div><strong>' + place.name + '</strong><br>' +
                    //     '<strong> Telefon no: </strong> &nbsp;' + place.formatted_phone_number + '<br> <button  (click)="gel()">Gel </button></div>';
                }
                else {
                    $("#yerIsmi").text("Yer ismi = " + place.name);
                    $("#telefonNumarasi").text("");
                    THIS.rotaKordinat = place.geometry.location.lat() + "," + place.geometry.location.lng();
                    //metin = '<div><strong>' + place.name + '</strong><br> <button  onclick="gel()">Gel </button></div>';
                }
                if (!THIS.gosterKontrol) {  // markere tıklandığında detay divi acılması için. bu şartı koymaz isek basışımıza kapanıp acılacak
                    THIS.sayfaIslemNesne.goster(5);
                    THIS.gosterKontrol = 1;
                }
                // THIS.infoWindow.setContent(metin);
                // THIS.infoWindow.open(THIS.map, marker);
            });

    }

    private buildIWContent(place) {
        alert(place.formatted_phone_number);
        document.getElementById('iw-icon').innerHTML = '<img class="hotelIcon" ' +
            'src="' + place.icon + '"/>';
        document.getElementById('iw-url').innerHTML = '<b><a href="' + place.url +
            '">' + place.name + '</a></b>';
        // document.getElementById('iw-address').textContent = place.vicinity;

        if (place.formatted_phone_number) {
            document.getElementById('iw-phone-row').style.display = '';
            document.getElementById('iw-phone').textContent =
                place.formatted_phone_number;
        } else {
            document.getElementById('iw-phone-row').style.display = 'none';
        }

    }
}

export class mapIslem {

    private index = 0; // dinleme işlevinde kullanılan özellik
    private directionsPanel; // rota divi
    private tts = new TextToSpeech();  // okuma için tts nesnesi oluşturuldu
    private directionsTextList = []; // direc panele dolan textleri parçalayıp bu diziye atıcaz
    private konum = false; // konum işaretlenip işaretlenmediği kontrol ediliyor
    private interval = 0; //  kalanMesafeInterval değişkeni. Mesafe 100m ve aşasına düştüğünde okuma fonksiyonu ile directionPaneldeki gerekli metni okuyor
    // Yinemeli yol dinle(tüm rota texti)'ye basıldığında intervaldeki tts araya girmesin diye durdurulması gerekiyor. 
    private seyehatTuru = "DRIVING"; // drive veya walk
    private directionsDisplay; //ratalama için kullanılan değişken
    private map: any; // uygulamadaki map divi
    private baslangic; // baslangıc konumu
    private bitis; // bitis konumu

    private markerArray = [];

    constructor(directionsPanel, mapElement) {


        this.setDirections(directionsPanel);
        this.haritaYukle(mapElement);
    }

    private setDirections(Panel)
    {
        this.directionsPanel = Panel;
    }
    mapGet() {
        return this.map;
    }

    konumSet(konum) {
        this.konum = konum;
    }

    baslangicSet(baslangic) {
        this.baslangic = baslangic;
    }

    bitisSet(bitis) {
        this.bitis = bitis;

    }

    setSeyahatTuru(seyehatTuru) {
        this.seyehatTuru = seyehatTuru;
    }

    setİndex() {
        let THIS = this;
        THIS.index = THIS.directionsTextList.length;
    }

    private haritaYukle(mapElement) {

        let latLng = new google.maps.LatLng(40.193298, 29.074202);

        let mapOptions = {
            center: latLng,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };

        this.map = new google.maps.Map(mapElement.nativeElement, mapOptions);
        var trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(this.map);


        // girilen yer

        let types = "All" //= document.getElementById('type-selector'); // secilen tip

        // let autocomplete = new google.maps.places.Autocomplete(this.baslangic);
        // autocomplete.bindTo('bounds', this.map);
        // autocomplete.setFields(
        //     ['address_components', 'geometry', 'icon', 'name']);
        let input = document.getElementById("pac-input");
        let autocomplete = new google.maps.places.Autocomplete(input);
        autocomplete.bindTo('bounds', this.map);
        autocomplete.setFields(
            ['address_components', 'geometry', 'icon', 'name']);

        let input2 = document.getElementById("pac-input2");
        let autocomplete2 = new google.maps.places.Autocomplete(input2);
        autocomplete2.bindTo('bounds', this.map);
        autocomplete2.setFields(
            ['address_components', 'geometry', 'icon', 'name']);

        let input3 = document.getElementById("pac-input3");
        let autocomplete3 = new google.maps.places.Autocomplete(input3);
        autocomplete3.bindTo('bounds', this.map);
        autocomplete3.setFields(
            ['address_components', 'geometry', 'icon', 'name']);

        function setupClickListener(id, types) {
            //var radioButton = document.getElementById(id);
            //radioButton.addEventListener('click', function () {
            autocomplete.setTypes(types);
            // });
        }
        function setupClickListener2(id, types) {
            //var radioButton = document.getElementById(id);
            //radioButton.addEventListener('click', function () {
            autocomplete2.setTypes(types);
            // });
        }
        function setupClickListener3(id, types) {
            //var radioButton = document.getElementById(id);
            //radioButton.addEventListener('click', function () {
            autocomplete3.setTypes(types);
            // });
        }

        setupClickListener('changetype-all', []);
        setupClickListener2('changetype-all', []);
        setupClickListener3('changetype-all', []);

    }

    private yolDinle(metin) { // mesafe m olduğunda tek metin okumak için kullanılıyor

        this.tts.speak({
            text: metin,
            locale: 'tr-TR',
            rate: 1
        });
    }

    yinemeliYolDinle(saniye) { // tüm yolu dinlemek için kullanılıyor

        let THIS = this;
        if (THIS.index <= THIS.directionsTextList.length - 1)
            setTimeout(() => {
                THIS.tts.speak({
                    text: THIS.directionsTextList[THIS.index],
                    locale: 'tr-TR',
                    rate: 1
                });

                try {
                    THIS.yinemeliYolDinle(this.directionsTextList[THIS.index++].length * 165);
                }
                catch (err) {
                    THIS.index = 0;
                    THIS.kalanMesafeKontrol();
                }
            }, saniye);
        else {
            THIS.index = 0;
            THIS.kalanMesafeKontrol();
        }
    }

    private navigasyonTetikle() {
        let THIS = this;
        setTimeout(() => {

            THIS.navigasyonBasla(false);

        }, 3000);
    }
    navigasyonBasla(kontrol) {

        for (let i = 0; i < this.markerArray.length; i++) {
            this.markerArray[i].setMap(null);
        }
        let stepDisplay = new google.maps.InfoWindow;
        if (kontrol) { // interval rota text almada sürekli rota cizip silmesin diye
            if (this.directionsDisplay) {
                this.directionsDisplay.setMap(null);
            }
        }
        let directionsService = new google.maps.DirectionsService;
        this.directionsDisplay = new google.maps.DirectionsRenderer;
        if (kontrol)
            this.directionsDisplay.setMap(this.map);
        this.directionsDisplay.setPanel(this.directionsPanel.nativeElement);
        directionsService.route({
            origin: this.baslangic,
            destination: this.bitis,
            travelMode: google.maps.TravelMode[this.seyehatTuru]
        }, (res, status) => {

            if (status == google.maps.DirectionsStatus.OK) {
                this.rotaTextiTemizle();
                this.rotaTextAl2(res.routes[0].legs[0]);
                this.directionsDisplay.setDirections(res);
                this.navigasyonMarker(res, this.markerArray, stepDisplay, this.map);

            } else {
                console.warn(status);
            }
        });
    }
    private navigasyonMarker(directionResult, markerArray, stepDisplay, map) {
        var rota = directionResult.routes[0].legs[0]; // json formatında gelen veri
        for (var i = 0; i < rota.steps.length; i++) {  // json formatında gelen ve directionsPanele dolan rota metinlerinin sayısı
            let marker = markerArray[i] = markerArray[i] || new google.maps.Marker;/*
                                           A
          Kodumuz arrayımızı sürekli sıfırlamıyor. Sıfırlamaktan kastımız markerArray = [] yapılmasıdır. Bundan dolayı örnek verir isek; 2 defa rotalama yapıldı.
          1.sinde rota steps sayısı 4 olsun. markerArray[i] tanımlanmadığından A false olur ve hem marker değişkenini hemde markerArray[i] elemanını yeni bir marker nesnesi yapar.
          2. rotalamada steps sayısı 9 oldu. markerArray dizisinde 4 eleman nesne olarak atanmış. Bundan dolayı ilk 4 eleman için A true döner. Geri kalan elemanlar için false dönüp
          tek tek nesne yapar.
         x= y= A || B  A true ise x ve y A olur( A== 0 false , A != 0 true), false düşer ise x ve y B olur.
          */
            marker.setMap(map);
            marker.setPosition(rota.steps[i].start_location); // kordinatlar
            this.textGoster(
                stepDisplay, marker, rota.steps[i].instructions, map);
        }
    }

    private textGoster(stepDisplay, marker, text, map) {
        google.maps.event.addListener(marker, 'click', function () {
            stepDisplay.setContent(text);
            stepDisplay.open(map, marker);
        });
    }

    private rotaTextiTemizle() {

        $("div.adp").remove();
    }

    private rotaTextHazirmi() {

        let THIS = this;
        let interval4 = setInterval(function () {
            if ($("td[jstcache = '32']").text().length > 0 || $("td[jstcache = '64']").text().length > 0) {
                THIS.rotaTextAl();
                clearInterval(interval4);
            }
        }, 500);
    }

    private rotaTextAl() {
        let text;
        let metin_string; // divden cekilen text için kullanılıyor
        let THIS = this;
        THIS.directionsTextList = [];
        let default_string = "";

        THIS.directionsTextList.push($("div.adp-summary").text()); // mesafe yazısı

        $("td[jstcache = '32']").text().length > 0 ? metin_string = $("td[jstcache = '32']").text() : metin_string = $("td[jstcache = '64']").text();
        for (let i = 0; i < metin_string.length - 1; i++) {
            if
            (
                (
                    (metin_string[i].charCodeAt(0) >= 97 && metin_string[i].charCodeAt(0) <= 122) || (metin_string[i].charCodeAt(0) == 46)
                )
                &&
                (
                    (metin_string[i + 1].charCodeAt(0) >= 65 && metin_string[i + 1].charCodeAt(0) <= 90)
                    ||
                    (
                        metin_string[i + 1] == 'Ş'
                        ||
                        metin_string[i + 1] == 'Ü'
                        ||
                        metin_string[i + 1] == 'Ö'
                        ||
                        metin_string[i + 1] == 'İ'
                        ||
                        metin_string[i + 1] == 'Ğ'
                        ||
                        metin_string[i + 1] == 'Ç'
                    )
                )
            ) {

                //46  değeri nokta için.                   
                text = metin_string[i + 1] + metin_string[i + 2] + metin_string[i + 3] + metin_string[i + 4] + metin_string[i + 5] + metin_string[i + 6];

                if (text == "Kısmen") {

                    text = (default_string + metin_string[i] + "Kısmen paralı yol");
                    THIS.directionsTextList.push(text);
                    i = i + 17;
                }

                else if (text == "Paralı") {
                    text = (default_string + metin_string[i] + "Paralı yol");
                    THIS.directionsTextList.push(text);
                    i = i + 10;
                }
                else {
                    text = (default_string + metin_string[i]);
                    THIS.directionsTextList.push(text);
                }
                default_string = "";
            }
            else {
                default_string += metin_string[i];
            }
        }
        default_string += metin_string[metin_string.length - 1];
        THIS.directionsTextList.push(default_string);

        THIS.yolDinle(THIS.directionsTextList[0]);

        setTimeout(() => {


            if (THIS.konum) {

                THIS.mesafeMetinAlma(); // ilk gelen mesafe eğer mesafesi m ise direk okuması için
                THIS.kalanMesafeKontrol();
            }

        }, 2000);

    }

    private rotaTextAl2(metinDizisi) {

        let THIS = this;
        THIS.directionsTextList = [];
        let olusturulanMetin = " ";
        let kontrol = false;
        THIS.directionsTextList.push(metinDizisi.distance.text + metinDizisi.duration.text);

        for (let i = 0; i < metinDizisi.steps.length; i++) {
            for (let index = 0; index < metinDizisi.steps[i].instructions.length; index++) {
                if (metinDizisi.steps[i].instructions[index] == "<" || kontrol) {
                    kontrol = true;

                    if (metinDizisi.steps[i].instructions[index + 2] == ">") {
                        index += 2;
                        kontrol = false;
                    }
                }
                else {
                    olusturulanMetin += metinDizisi.steps[i].instructions[index];
                }
            }
            THIS.directionsTextList.push(olusturulanMetin);
            olusturulanMetin = " ";
        }

        if (!THIS.interval) // interval başlamamış ise
        {
            THIS.yolDinle(THIS.directionsTextList[0]);

            setTimeout(() => {
                if (THIS.konum) {

                    THIS.mesafeMetinAlma(); // ilk gelen mesafe eğer mesafesi m ise direk okuması için
                    THIS.kalanMesafeInterval();
                }
            }, 5000);
        }
    }

    intervalDurdur() { // dinle butonuna basıldığında ilk bu fonksiyon tetiklenir
        let THIS = this;
        if (THIS.konum) {

            clearInterval(THIS.interval);
            THIS.yinemeliYolDinle(0);
        }
        else {
            THIS.yinemeliYolDinle(0);
        }
    }

    private kalanMesafeInterval() {

        let THIS = this;
        let sure = 15000;

        if (THIS.seyehatTuru == "DRIVING") sure = 12000;

        THIS.interval = setInterval(function () {

            THIS.navigasyonTetikle();
            THIS.mesafeTetikle();

        }, sure); ///kc ku şift alt f
    }

    kalanMesafeKontrol() {

        if (this.konum) {
            this.kalanMesafeInterval();
        }
        else {
            clearInterval(this.interval);
            this.interval = 0;
        }
    }

    private mesafeTetikle() {

        let THIS = this;

        setTimeout(() => {

            THIS.mesafeMetinAlma();

        }, 1000);

    }

    private mesafeMetinAlma() {

        let THIS = this;
        let metin_string;
        let string;

        $("div[jstcache = '33']").first().text().length > 0 ? string = $("div[jstcache = '33']").first().text() : string = $("div[jstcache = '65']").first().text();
        $("td[jstcache = '32']").first().text().length > 0 ? metin_string = $("td[jstcache = '32']").first().text() : metin_string = $("td[jstcache = '64']").first().text();
        if (THIS.metinParcala(string) == 'm')
            THIS.yolDinle(string + "sonra " + metin_string);
        if (string.length <= 0) clearInterval(THIS.interval);

    }
    private metinParcala(metin) {

        return metin.split(' ')[1];
    }

}
