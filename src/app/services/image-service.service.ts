import { Injectable } from "@angular/core";
import { HttpClient, HttpParams, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import * as qrcode from "qrcode-generator";
import { isDevMode } from '@angular/core';

export type ColorSchemes =
  | "Cornfield"
  | "Metallic"
  | "Sunset"
  | "Starnight"
  | "BeforeDawn"
  | "Nature"
  | "DeepOcean"
  | "Solarized"
  | "Tomorrow"
  | "Tomorrow 2"
  | "Tomorrow"
  | "Night"
  | "Monotone";

interface ImgResponse {
  url: string;
  id: string;
}

@Injectable({
  providedIn: "root",
})
export class ImageService {
  
  constructor(private http: HttpClient) {}

  generateSCAD(name: string, address: string, primaryColor: string, secondaryColor: string) {
    var qr = qrcode(0, "L");
    qr.addData(address);
    qr.make();
    var module_count = qr.getModuleCount();

    var qr_data = "";

    for (var r = 0; r < module_count; r++) {
      if (r == 0) {
        qr_data += "qr_data = [[";
      } else {
        qr_data += "           [";
      }
      for (var c = 0; c < module_count; c++) {
        var pixelValue = qr.isDark(r, c);
        qr_data += pixelValue ? "1" : "0";
        if (c < module_count - 1) qr_data += ",";
      }
      if (r < module_count - 1) {
        qr_data += "],";
      } else {
        qr_data += "]];";
      }
    }

    var translate_x = 54-(module_count+(module_count/5))
    var translate_y = 84-(module_count+(module_count/5))
    var exclusion_x = 18-((module_count/3)+(module_count/6.75))
    var exclusion_y = 28-((module_count/3)+(module_count/6.75))

    var textSize = 6;
    if (name.length > 16) {
      textSize = 5
    } 
    if (name.length > 24) {
      textSize = 4
    }
    

    return `
    difference() {
      union() {
        translate([5,6,0]) color(${secondaryColor}) linear_extrude(height = 2.2)  text("${name}", font = "Kredit:style=Back", size = ${textSize});
  
        translate([${translate_y}, ${translate_x}, 0]) color(${secondaryColor}) qr_render(qr_data);
  
        card();
      }

      translate([26,35,.2]) color("black") cylinder(.2, 13.5, 13.5);
    }

    module qr_render(data, module_size = 1.2, height = 2.2) {
      maxmod = len(data) - 1;
        union() {
        for(r = [0 : maxmod]) {
            for(c = [0 : maxmod]) {
                if(data[r][c] == 1){
                    xo = c * module_size;
                    yo = (maxmod - r) * module_size;
                    translate([xo, yo, 0]) cube([module_size, module_size, height]);
                }
            }
        }
      }
    }

    module card() {
      for(i = [1:18 ]) {
        union() {
            for(j = [1:28.5]) {
                if(i > ${exclusion_x} && j > ${exclusion_y} || i < 4 && i > 1 && j < 40) {
                    rand = rands(.6,1.2,1)[0];
                    translate([j*3, i*3, 0]) color(${primaryColor}) cube([3, 3, rand]);
                  } else {
                    rand = rands(.6,1.6,1)[0]; 
                    if(rand > 1.4) {
                        translate([j*3, i*3, 0]) color(${primaryColor}) cube([3, 3, 1.4]);
                        translate([j*3, i*3, 1.4]) color(${secondaryColor}) cube([3, 3, .2]);
                    } else {                  
                        translate([j*3, i*3, 0]) color(${primaryColor}) cube([3, 3, rand]);
                    }
                }
            }
        }
      }
    }
    
    ${qr_data} 
    `;
  }

  getImage(
    code: string,
    size: string,
    colorscheme: ColorSchemes
  ): Observable<ImgResponse> {
    const payload = new HttpParams()
      .set("code", code)
      .set("size", size)
      .set("colorscheme", colorscheme);

    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
    };

    return this.http.post<ImgResponse>("https://api.bitprint.io/api/png", payload, httpOptions);
  }

  getStl(
    code: string
  ): Observable<ImgResponse> {
    const payload = new HttpParams()
      .set("code", code);

    const httpOptions = {
      headers: new HttpHeaders({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
    };

    return this.http.post<ImgResponse>("https://api.bitprint.io/api/stl", payload, httpOptions);
  }
}
