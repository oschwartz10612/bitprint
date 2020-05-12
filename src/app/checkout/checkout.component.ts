import { Component, OnInit } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AngularFirestore } from '@angular/fire/firestore';
import * as firebase from 'firebase';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  uid: string;
  isLoading: boolean;

  constructor(private auth: AuthService, private afs: AngularFirestore) { }

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

}
