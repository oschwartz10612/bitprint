import { Component } from '@angular/core';
import { ImageService } from "../services/image-service.service";
import { PaymentService } from "../services/payment-service.service";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './generate.component.html',
  styleUrls: ['./generate.component.css']
})
export class GenerateComponent {

  imageToShow: string = 'assets/img/default.png';
  isImageLoading: boolean;
  imgSize: number;

  stlToDownload: string;
  isStlLoading: boolean;

  constructor(private imageService: ImageService, private paymentService: PaymentService, private _formBuilder: FormBuilder) {}

  ngOnInit() {

  }

  getImage(name: string, address: string) {
    var scad = this.imageService.generateSCAD(name, address, '[.25,.25,.25]', '[.9,.9,.9]');
    console.log(scad);
    
    this.isImageLoading = true;
    this.imageService.getImage(scad, '2000,2000', "Nature").subscribe(data => {
      console.log(data.url);
      this.imageToShow = data.url;
      this.isImageLoading = false;
    }, error => {
      this.isImageLoading = false;
      console.log(error);
    });
  }

  getStl(name: string, address: string) {
    var scad = this.imageService.generateSCAD(name, address, "black", "white");
    console.log(scad);
    
    this.isStlLoading = true;
    this.imageService.getStl(scad).subscribe(data => {
      console.log(data.url);
      this.stlToDownload = data.url;
      this.isStlLoading = false;
    }, error => {
      this.isStlLoading = false;
      console.log(error);
    });
  }
}
