import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import * as firebase from 'firebase';
import { FormGroup, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  uid: string;
  isLoading: boolean;

  checkoutForm = new FormGroup({
    firstName: new FormControl('', Validators.required),
    lastName: new FormControl('', Validators.required),
    email: new FormControl('', [Validators.required, Validators.email]),
    address: new FormControl('', Validators.required),
    address2: new FormControl(''),
    country: new FormControl('', Validators.required),
    state: new FormControl('', Validators.required),
    zip: new FormControl('', Validators.required)
  });

  constructor(private auth: AuthService, private afs: AngularFirestore, private fns: AngularFireFunctions) { }

  ngOnInit() {
    this.auth.user$.subscribe((user) => {
      console.log(user);


      
      if (!user) {

      } else {

        this.uid = user.uid;
      }
      this.isLoading = false;


    })
  }

  removeItem(item: any) {
    this.afs.doc(`users/${this.uid}`).update({
      cart: firebase.firestore.FieldValue.arrayRemove(item),
      totalCost: firebase.firestore.FieldValue.increment(-item.cost)
    });
  }

  async onSubmit() {
    console.log(this.checkoutForm.value)
    const callable = this.fns.httpsCallable('createCharge');
    var data = await callable({ form: this.checkoutForm.value }).toPromise();
    window.open(data.uri, "_blank");
  }
}
