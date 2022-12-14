import React, { useState } from "react"
import useValidator from '../../../Hooks/useValidator';
import axios from 'axios';
import position from '../../../Context/position'
import { setUser } from "../../../userSlice";
import { useDispatch } from 'react-redux';


const SignUpForm = ({email, setEmail, setError, setOpen, setHasSignedUP}) => {

    const dispatch = useDispatch();
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [invalidFields, setInvalidFields] = useState([]);
    const [validator, showValidationMessage] = useValidator(null,
        {
            match: {
                rule: () => {
                    return password === passwordConfirm;
                },
            }
        });

    const saveToRedux = (data) => {
        console.log('redux data', data);
        dispatch(setUser(data));
    }
    const addUser = () => {
        axios.post('http://localhost:3001/users', {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            longitude: position.longitude,
            latitude: position.latitude,
        })
            .then(response => {
                console.log(response);
                setHasSignedUP(true);
                saveToRedux(response.data);
                localStorage.setItem('jwt', response.data);
                return ;
            })
            .catch(error => {
                console.log(error);
                setOpen(true);
                setError([error.response.status, error.response.data]);
            });
    }

    const handleSignUpClick = (event) => {
        event.preventDefault();
        if (validator.allValid()) {
            console.log("form is valid");
            addUser();
        } else {
            const invalidFieldsSet = new Set(invalidFields);
            (!validator.check(firstName, "required|alpha|max:15")) ? invalidFieldsSet.add('firstName') : invalidFieldsSet.delete('firstName');
            (!validator.check(lastName, "required|alpha|max:15")) ? invalidFieldsSet.add('lastName') : invalidFieldsSet.delete('lastName');
            (!validator.check(email, "required|email")) ? invalidFieldsSet.add('email') : invalidFieldsSet.delete('email');
            (!validator.check(password, "required|match|min:12")) ? invalidFieldsSet.add('password') : invalidFieldsSet.delete('password');
            (!validator.check(passwordConfirm, "required|match")) ? invalidFieldsSet.add('passwordConfirm') : invalidFieldsSet.delete('passwordConfirm');

            // validator.showMessages();
            // rerender to show messages for the first time
            console.log(invalidFieldsSet);
            showValidationMessage(true);
            setInvalidFields(Array.from(invalidFieldsSet));
            return
        }
    }

    return (
        <>
            <h1 className="self-start text-2xl font-bold mb-2">Create your account</h1>
            <label className={`block ${invalidFields.includes('firstName') ? "text-red-500" : "text-gray-700"} text-sm font-bold self-start mb-1`}>
                First name
                <span className="text-red-500 font-normal inline-block pl-1">
                    {validator.message("firstName", firstName, "required|alpha|max:15", {
                        messages: {
                            required: " is required",
                            alpha: " isn't valid",
                            max: " too long"
                        }
                    })}</span>
            </label>
            <input className={`${invalidFields.includes('firstName') ? "text-red-500 border-red-500" : "text-gray-700"} shadow appearance-none border rounded w-full mb-4 py-2 px-3 leading-tight focus:outline-none focus:shadow-outline`} id="firstname" type="text" placeholder="John"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)} />

            <label className={`block ${invalidFields.includes('lastName') ? "text-red-500" : "text-gray-700"} text-sm font-bold self-start mb-1`}>
                Last Name
                <span className="text-red-500 font-normal inline-block pl-1">{validator.message("lastName", lastName, "required|alpha|max:15", {
                    messages: {
                        required: " is required",
                        alpha: " isn't valid",
                        max: "too long"
                    }
                })}</span>
            </label>
            <input className={`shadow appearance-none border rounded w-full mb-4 py-2 px-3 ${invalidFields.includes('lastName') ? " text-red-500 border-red-500" : "text-gray-700"} leading-tight focus:outline-none focus:shadow-outline`} id="lastname" type="text" placeholder="Doe"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)} />

            <label className={`block ${invalidFields.includes('email') ? "text-red-500 border-red-500" : "text-gray-700"} text-sm font-bold self-start mb-1`}>
                Email address
                <span className="text-red-500 font-normal inline-block pl-1">{validator.message("email", email, "required|email", {
                    messages: {
                        required: " is required",
                        email: ' isn\'t valid'
                    }
                })}</span>
            </label>
            <input className={`shadow appearance-none border rounded w-full mb-4 py-2 px-3 ${invalidFields.includes('email') ? "text-red-500 border-red-500" : "text-gray-700"} leading-tight focus:outline-none focus:shadow-outline`} id="email" type="text" placeholder="john.doe@gmail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)} />

            <label className={`block ${invalidFields.includes('password') ? " text-red-500" : "text-gray-700"} text-sm font-bold self-start mb-1`}>
                Password
                <span className="text-red-500 font-normal inline-block pl-1">{validator.message("password", password, "required|match|min:12", {
                    messages: {
                        required: " is required",
                        match: "doesn't match",
                        min: " too short, at least 12 characters"
                    },
                })}</span>
            </label>
            <input className={`shadow appearance-none border rounded w-full py-2 px-3 ${invalidFields.includes('password') ? " text-red-500 border-red-500" : "text-gray-700"} mb-3 leading-tight focus:outline-none focus:shadow-outline`} id="password" type="password" placeholder="***********" value={password} onChange={(event) => setPassword(event.target.value)} />

            <label className={`block ${invalidFields.includes('passwordConfirm') ? "text-red-500" : "text-gray-700"} text-sm font-bold self-start mb-1`}>
                Password confirmation
                <span className="text-red-500 font-normal inline-block pl-1">{validator.message("passwordConfirm", passwordConfirm, "required|match", {
                    messages: {
                        required: " is required",
                        match: "doesn't match"
                    },
                })}</span>
            </label>
            <input className={`shadow appearance-none border rounded w-full py-2 px-3 ${invalidFields.includes('passwordConfirm') ? "text-red-500 border-red-500" : "text-gray-700"} mb-3 leading-tight focus:outline-none focus:shadow-outline`} id="passwordConfirm" type="password" placeholder="***********" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} />
            <button onClick={handleSignUpClick} className="h-10 w-full items-center justify-center  gap-2 px-6 text-sm font-medium tracking-wide text-white transition duration-300 rounded whitespace-nowrap bg-emerald-500 hover:bg-emerald-600 focus:bg-emerald-700 focus-visible:outline-none">
                <span>Sign up</span>
            </button>
        </>
    );
}

export default SignUpForm;