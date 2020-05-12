import { Component } from '@angular/core';
import { ImageService } from "../services/image-service.service";
import { PaymentService } from "../services/payment-service.service";
import { AuthService } from "../services/auth.service";
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { ThrowStmt } from '@angular/compiler';
import * as firebase from 'firebase/app';

@Component({
  selector: 'app-root',
  templateUrl: './generate.component.html',
  styleUrls: ['./generate.component.css']
})
export class GenerateComponent {

  imageToShow: string;
  isImageLoading: boolean = true;
  imgSize: number;

  canCheckout: boolean;

  stlToDownload: string;
  isStlLoading: boolean;

  uid: string;

  productName: string = 'Bitcard';
  productCost: number = 10;

  currentAddress: string;
  currentCode: string;


  constructor(private afs: AngularFirestore, private imageService: ImageService, private paymentService: PaymentService, private auth: AuthService) {}

  ngOnInit() {
    this.auth.user$.subscribe((user) => {
      console.log(user);


      this.isImageLoading = false;
      if (!user) {
        this.imageToShow = 'test'
      } else {
        this.imageToShow = user.currentImg;
        this.uid = user.uid;
        this.currentAddress = user.currentAddress;
        this.currentCode = user.currentCode;

        if (user.cart.length > 0) {
          this.canCheckout = true;
        } else {
          this.canCheckout = false;
        }

      }



    })
  }

  addToCart() {
    this.afs.doc(`users/${this.uid}`).update({
      cart: firebase.firestore.FieldValue.arrayUnion({
        name: this.productName,
        img: this.imageToShow,
        cost: this.productCost,
        id: this.genId(),
        address: this.currentAddress,
        code: this.currentCode
      }),
      totalCost: firebase.firestore.FieldValue.increment(this.productCost)
    });
  }



  getImage(name: string, address: string) {
    var scad = this.imageService.generateSCAD(name, address, '[.25,.25,.25]', '[.9,.9,.9]');
    console.log(scad);
    
    this.isImageLoading = true;
    this.imageService.getImage(scad, '2000,2000', "Nature").subscribe(async (data) => {
      console.log(data.url);

      var user = await this.auth.isLoggedIn();
      if (!user) {
        await this.auth.loginAnon();
      }

      await this.afs.doc(`users/${this.uid}`).update({
        currentImg: data.url,
        currentAddress: address,
        currentCode: scad
      });
  
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

  private genId(): string {
    const isString = `${this.S4()}${this.S4()}-${this.S4()}-${this.S4()}-${this.S4()}-${this.S4()}${this.S4()}${this.S4()}`;

    return isString;
  }

  private S4(): string {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }

}
