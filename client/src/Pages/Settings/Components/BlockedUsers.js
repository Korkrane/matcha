import NavBar from '../../Navbar/NavBar';
import SettingsMenu from './SettingsMenu';
import axios from 'axios';
import { useEffect, useState } from 'react';
import SettingsHeader from './SettingsHeader';
import { useSelector } from 'react-redux';
import SettingsPageLayout from './SettingsPageLayout';

const BlockedUsers = () => {

	const [blockedUsers, setBlockedUsers] = useState([]);
	const currentUser = useSelector((state) => state.user.user);

	//unblock a user
	const unblockUser = (event, id) => {
		event.preventDefault();
		console.log('unblock user', id);
		axios.delete('http://localhost:3001/relations', {
			data:{
				sender_id: currentUser.id,
				receiver_id: id,
				type: 'block'
			}
		  })
		.then(response => {
			getBlockedUsers();
		})
		.catch(error => {
			console.log(error);
		});
	}

	const getBlockedUsers = () => {
		axios.get(`http://localhost:3001/users/${currentUser.id}/blocked`)
            .then(response => {
				setBlockedUsers(response.data);
            })
            .catch(error => {
                console.log(error);
            });
    }

	useEffect(() => {
			getBlockedUsers();
	  }, []);


	return (
		<>
			<SettingsPageLayout>
				<SettingsMenu />
				<div className='text-white bg-chess-dark p-4 rounded-lg max-w-3xl'>
					<span className='font-bold'>Blocked Users</span>
					<p className='text-sm py-2 break-words'>
						A blocked user will not see your profile appear in their searches, or be able to send you messages. Blocking a user will delete your chat history with them
					</p>
					<div className="pt-2">
						{
							blockedUsers.length > 0 ?
								<table className="text-white w-full text-left">
									<tbody>
										{blockedUsers.map((user, index) => (
											<tr key={index} className="border-b border-chess-bar text-xs">
												<td>
													{user.first_name} {user.last_name}
												</td>
												<td className="text-right">
													<button onClick={(event) => unblockUser(event, user.id)}>Unblock</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
								:
								<div>No users blocked yet</div>
						}

					</div>
				</div>
			</SettingsPageLayout>
		</>
	)
}

export default BlockedUsers;