import NavBar from '../../Navbar/NavBar';
import SettingsMenu from './SettingsMenu';
import { Cog6ToothIcon, EyeIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { current } from 'daisyui/src/colors';
import SettingsHeader from './SettingsHeader';

import { useSelector } from 'react-redux';


const Password = () => {

    const [currentPassword, setCurrentPassword] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const [isRevealed, setIsRevealed] = useState(false);
    const toggleReveal = () => setIsRevealed(!isRevealed);

    const [isRevealedConfirm, setIsRevealedConfirm] = useState(false);
    const toggleRevealConfirm = () => setIsRevealedConfirm(!isRevealedConfirm);


    const user = useSelector((state) => state.user);

    const resetPassword = () => {
        console.log('reset password clicked');
        axios.put(`http://localhost:3001/users/resetpassword`, {
            currentPassword: currentPassword,
            newPassword: password,
            id: user.id
        })
            .then(response => {
                console.log(response);
            })
            .catch(error => {
                console.log(error);
            });
    }


	useEffect(() => {
			console.log('password', user);
	  }, []);

	return (
		<>
			<div className="bg-chess-default min-h-screen overflow-y-auto">
				<NavBar/>
				<div className='mx-2 pt-16 h-screen'>
                    <SettingsHeader/>
					<div className='flex gap-4 mt-2 sm:mx-40'>
						<SettingsMenu/>
						<div className='relative text-white bg-chess-dark p-4 rounded-lg w-full'>
							<span className='font-bold'>Change password</span>
                            <div className=' pt-2 flex flex-col sm:flex-row mb-2 sm:justify-between sm:gap-2'>
                                    <label className="text-white text-sm self-start">
                                        Current password
                                    </label>
                                    <div className='bg-chess-placeholder flex flex-row rounded-sm sm:w-64'>
                                        <input className=" px-2 bg-transparent text-white rounded-sm focus:outline-none focus:shadow-outline" id="currentPass"
                                                type='password'
                                                value={currentPassword}
                                                onChange={(event) => setCurrentPassword(event.target.value)} />
                                    </div>
                            </div>
                            <div className='flex flex-col mb-2 sm:flex-row sm:justify-between sm:gap-2'>
                                    <label className="text-white text-sm self-start">
                                        New password
                                    </label>
                                <div className='bg-chess-placeholder flex flex-row rounded-sm sm:w-64'>
                                        <input className=" px-2 bg-transparent text-white rounded-sm focus:outline-none focus:shadow-outline" id="password"
                                                type={isRevealed ? 'text' : 'password'}
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)} />
                                        <button onClick={toggleReveal}>
                                            <EyeIcon className={`h-6 w-6 p-1 ml-4 text-chess-place-text hover:text-white`}/>
                                        </button>
                                    </div>

                            </div>
                            <div className='flex flex-col sm:flex-row mb-2 sm:justify-between sm:gap-2'>
                                    <label className="text-white text-sm self-start">
                                        Confirm new password
                                    </label>
                                    <div className='bg-chess-placeholder flex flex-row rounded-sm sm:w-64'>
                                        <input className=" px-2 bg-transparent text-white rounded-sm focus:outline-none focus:shadow-outline" id="passwordConfirm"
                                                type={isRevealedConfirm ? 'text' : 'password'}
                                                value={passwordConfirm}
                                                onChange={(event) => setPasswordConfirm(event.target.value)} />
                                        <button onClick={toggleRevealConfirm}>
                                            <EyeIcon className={`h-6 w-6 p-1 ml-4 text-chess-place-text hover:text-white`}/>
                                        </button>
                                    </div>

                            </div>
                            <button onClick={resetPassword}  className={`btn btn-sm absolute bottom-2 sm:bottom-5 rounded-md  bg-green-600 hover:bg-green-500 ${ password !== passwordConfirm || password.length <= 0 ? 'btn-disabled': ''}`}>Change password</button>
						</div>
					</div>

				</div>
			</div>
		</>
	)
}

export default Password;