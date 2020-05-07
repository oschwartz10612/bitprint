import { Component } from '@angular/core';
import { ImageService } from "./image-service.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  imageToShow: string;
  isImageLoading: boolean;

  stlToDownload: string;
  isStlLoading: boolean;

  constructor(private imageService: ImageService) {}

  ngOnInit() {
    
  }

  getImage(name: string, address: string) {
    var scad = this.imageService.generateSCAD(name, address);
    console.log(scad);
    
    this.isImageLoading = true;
    this.imageService.getImage(scad, '2000,2000', "Tomorrow").subscribe(data => {
      console.log(data.url);
      this.imageToShow = data.url;
      this.isImageLoading = false;
    }, error => {
      this.isImageLoading = false;
      console.log(error);
    });
  }

  getStl(name: string, address: string) {
    var scad = this.imageService.generateSCAD(name, address);
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
