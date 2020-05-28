import { Component, ElementRef } from '@angular/core';
import { ImageService } from "../services/image-service.service";
import { PaymentService } from "../services/payment-service.service";
import { AuthService } from "../services/auth.service";
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
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
  primaryColor: string;
  secondaryColor: string;

  backgroundWarning: boolean = false;
  conflictingColors: boolean = false;

  generateForm = new FormGroup({
    address: new FormControl('', Validators.required),
    name: new FormControl('', Validators.required),
    primaryColor: new FormControl('White', Validators.required),
    secondaryColor: new FormControl('Black', Validators.required)
  });

  constructor(private afs: AngularFirestore, private imageService: ImageService, private paymentService: PaymentService, private auth: AuthService, private elementRef: ElementRef) {}

  ngOnInit() {
    this.auth.user$.subscribe((user) => {

      this.isImageLoading = false;
      if (!user) {
        this.imageToShow = '/assets/img/example.png'
      } else {
        this.imageToShow = user.currentImg;
        this.uid = user.uid;
        this.currentAddress = user.currentAddress;
        this.currentCode = user.currentCode;

        this.primaryColor = user.generateForm.primaryColor
        this.secondaryColor = user.generateForm.secondaryColor


        this.generateForm.patchValue({
          address: user.generateForm.address,
          name: user.generateForm.name,
          primaryColor: user.generateForm.primaryColor,
          secondaryColor: user.generateForm.secondaryColor
        });
      }
    })
  }

  ngAfterViewInit(){
    this.elementRef.nativeElement.ownerDocument.body.style.backgroundColor = '#fafafa';
  }

  addToCart() {
    this.afs.doc(`users/${this.uid}`).update({
      cart: firebase.firestore.FieldValue.arrayUnion({
        name: this.productName,
        img: this.imageToShow,
        cost: this.productCost,
        id: this.genId(),
        address: this.currentAddress,
        code: this.currentCode,
        primaryColor: this.primaryColor,
        secondaryColor: this.secondaryColor
      }),
      totalCost: firebase.firestore.FieldValue.increment(this.productCost)
    });
  }

  getImage() {

    var name = this.generateForm.value.name;
    var address = this.generateForm.value.address;
    var primaryColor = this.generateForm.value.primaryColor;
    var secondaryColor = this.generateForm.value.secondaryColor;

    var primaryColorValues;
    switch (primaryColor) {
      case 'Black':
        primaryColorValues = [0.25, 0.25, 0.25];
        break;
      case 'White':
        primaryColorValues = [0.9, 0.9, 0.9]; 
        break;
      case 'Purple':
        primaryColorValues = [0.79, 0.30, .85];
        break;
    }

    var secondaryColorValues;
    switch (secondaryColor) {
      case 'Black':
        secondaryColorValues = [0.25, 0.25, 0.25];
        break;
      case 'White':
        secondaryColorValues = [0.9, 0.9, 0.9];
        break;
      case 'Purple':
        secondaryColorValues = [0.79, 0.30, 0.85];
        break;
    }

    var primaryColorTotal = 0;
    var secondaryColorTotal = 0;
    for (let i = 0; i < 2; i++) {
      primaryColorTotal = primaryColorTotal + primaryColorValues[i];
      secondaryColorTotal = secondaryColorTotal + secondaryColorValues[i];
    }

    if (primaryColorTotal == secondaryColorTotal) {
      this.conflictingColors = true;
    } else {
      this.conflictingColors = false;
    } 
    
    if (primaryColorTotal < secondaryColorTotal) {
      this.backgroundWarning = true;
    } else {
      this.backgroundWarning = false;
    }

    var scad = this.imageService.generateSCAD(name, address, JSON.stringify(primaryColorValues), JSON.stringify(secondaryColorValues));
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
        currentCode: scad,
        generateForm: {
          address: address,
          name: name,
          primaryColor: primaryColor,
          secondaryColor: secondaryColor
        }
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
